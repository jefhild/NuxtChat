-- =============================================================================
-- Matching schema
--
-- Builds on top of the existing live_mood_states / mood_preferences /
-- bot_handoffs infrastructure from 20260326_add_bot_platform_v1.sql.
--
-- live_mood_states  — ephemeral current state (2h TTL), written by starter
--                     personas. Already exists. Not modified here.
--
-- NEW tables:
--   match_intakes          — point-in-time snapshot of live_mood_states taken
--                            at handoff completion. Persists beyond the 2h TTL
--                            so the matching algorithm can use it later.
--   match_requests         — active queue entry (one pending per user).
--   matches                — resolved pair (user↔user or user↔AI).
--   match_notification_log — audit trail for digest emails.
--
-- NEW profile columns:
--   match_notification_frequency     — 'off' | 'daily' | 'weekly'
--   match_notification_last_sent_at
--
-- Taxonomy values deliberately mirror LIVE_MOOD_TAXONOMY in botPlatform.ts:
--   emotion    : lonely | calm | annoyed | overwhelmed | playful | curious | hopeful | sad
--   intent     : be_heard | listen | distract_me | deep_talk | casual_chat | meet_someone_similar
--   energy     : drained | normal | wired
--   privacy    : public_mood_post | private_matching_only
--   time_horizon: right_now | today | generally_lately
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. match_intakes
--    Snapshot of the mood state captured by a starter persona during the
--    post-onboarding conversation. A new row is inserted each time the user
--    runs (or re-runs) the intake flow. The most recent row wins for matching
--    (see match_intakes_latest view below).
-- -----------------------------------------------------------------------------
create table if not exists public.match_intakes (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null
                                 references public.profiles (user_id) on delete cascade,

  -- Mirrors live_mood_states taxonomy exactly
  emotion          text        null,
  intent           text        null,
  energy           text        null,
  privacy          text        not null default 'private_matching_only',
  time_horizon     text        not null default 'right_now',
  free_text_raw    text        null,
  free_text_refined text       null,
  confidence       numeric(4,3) null,

  -- Extra fields not in live_mood_states
  topic_hint       text        null,   -- mapped: family | work | relationships | health | general
  source_persona   text        null,   -- e.g. 'starter-masculine', 'starter-feminine'
  locale           text        null,
  transcript       jsonb       null,   -- full conversation, for debugging / future ML

  created_at       timestamptz not null default now(),

  constraint match_intakes_emotion_chk check (
    emotion is null or emotion in (
      'lonely', 'calm', 'annoyed', 'overwhelmed',
      'playful', 'curious', 'hopeful', 'sad'
    )
  ),
  constraint match_intakes_intent_chk check (
    intent is null or intent in (
      'be_heard', 'listen', 'distract_me',
      'deep_talk', 'casual_chat', 'meet_someone_similar'
    )
  ),
  constraint match_intakes_energy_chk check (
    energy is null or energy in ('drained', 'normal', 'wired')
  ),
  constraint match_intakes_privacy_chk check (
    privacy in ('public_mood_post', 'private_matching_only')
  ),
  constraint match_intakes_time_horizon_chk check (
    time_horizon in ('right_now', 'today', 'generally_lately')
  ),
  constraint match_intakes_topic_hint_chk check (
    topic_hint is null or topic_hint in (
      'family', 'work', 'relationships', 'health', 'general'
    )
  )
);

create index if not exists match_intakes_user_id_idx
  on public.match_intakes (user_id);

create index if not exists match_intakes_created_at_idx
  on public.match_intakes (user_id, created_at desc);

-- Composite index to support matching queries filtering by emotion + intent
create index if not exists match_intakes_emotion_intent_idx
  on public.match_intakes (emotion, intent);

comment on table  public.match_intakes                  is 'Point-in-time snapshot of mood signals from the starter persona conversation. Persists beyond the live_mood_states 2h TTL.';
comment on column public.match_intakes.topic_hint       is 'Mapped topic context. Not in LIVE_MOOD_TAXONOMY — added here to enrich matching.';
comment on column public.match_intakes.source_persona   is 'Persona key that ran the intake (e.g. starter-masculine, starter-feminine).';
comment on column public.match_intakes.transcript       is 'Full conversation as JSONB. Preserved for debugging and future ML use.';


-- -----------------------------------------------------------------------------
-- 2. match_requests
--    A user declares they want to be matched. Enforced to one pending request
--    per user at a time via partial unique index.
-- -----------------------------------------------------------------------------
create table if not exists public.match_requests (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null
                                  references public.profiles (user_id) on delete cascade,
  intake_id         uuid        null
                                  references public.match_intakes (id) on delete set null,

  status            text        not null default 'pending',
  allow_ai_fallback boolean     not null default true,

  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null default (now() + interval '2 hours'),
  matched_at        timestamptz null,

  constraint match_requests_status_chk check (
    status in ('pending', 'matched', 'expired', 'cancelled')
  )
);

-- One pending request per user at a time
create unique index if not exists match_requests_one_pending_per_user_idx
  on public.match_requests (user_id)
  where status = 'pending';

create index if not exists match_requests_status_expires_idx
  on public.match_requests (status, expires_at);

create index if not exists match_requests_user_id_idx
  on public.match_requests (user_id);

comment on table  public.match_requests                   is 'Active match queue. One pending entry per user enforced by partial unique index.';
comment on column public.match_requests.intake_id         is 'Intake snapshot driving this request. Nullable — cleared if intake is deleted.';
comment on column public.match_requests.allow_ai_fallback is 'Whether the algorithm may fall back to an AI persona if no real user is available.';
comment on column public.match_requests.expires_at        is 'Auto-expires 2 hours after creation if unmatched. Reset on re-match.';


-- -----------------------------------------------------------------------------
-- 3. matches
--    The resolved pair. user_id_b may be an AI persona's user_id.
--    Both user FKs cascade — if either user deletes their account the row goes.
-- -----------------------------------------------------------------------------
create table if not exists public.matches (
  id           uuid         primary key default gen_random_uuid(),

  user_id_a    uuid         not null
                              references public.profiles (user_id) on delete cascade,
  user_id_b    uuid         not null
                              references public.profiles (user_id) on delete cascade,

  request_id_a uuid         null
                              references public.match_requests (id) on delete set null,
  -- request_id_b is null for AI matches — AI personas don't have match_requests
  request_id_b uuid         null
                              references public.match_requests (id) on delete set null,

  is_ai_match  boolean      not null default false,

  -- 0.000–1.000 algorithmic quality score. Null until scoring is implemented.
  score        numeric(4,3) null,

  created_at   timestamptz  not null default now()
);

create index if not exists matches_user_id_a_idx
  on public.matches (user_id_a, created_at desc);

create index if not exists matches_user_id_b_idx
  on public.matches (user_id_b, created_at desc);

comment on table  public.matches             is 'Resolved match pairs. user_id_b may be an AI persona.';
comment on column public.matches.score       is 'Algorithmic match quality 0–1. Null until scoring is implemented.';
comment on column public.matches.is_ai_match is 'True when user_id_b is an AI persona rather than a real user.';


-- -----------------------------------------------------------------------------
-- 4. match_notification_log
--    One row per digest email sent. Prevents double-sends if the cron fires
--    twice and gives visibility into what was included in each email.
-- -----------------------------------------------------------------------------
create table if not exists public.match_notification_log (
  id          bigserial    primary key,
  user_id     uuid         not null
                             references public.profiles (user_id) on delete cascade,
  sent_at     timestamptz  not null default now(),
  frequency   text         not null,
  match_ids   uuid[]       not null default '{}',
  match_count int          not null default 0,

  constraint match_notification_log_frequency_chk check (
    frequency in ('daily', 'weekly')
  )
);

create index if not exists match_notification_log_user_id_idx
  on public.match_notification_log (user_id, sent_at desc);

comment on table  public.match_notification_log           is 'Audit trail for match digest emails. One row per send event.';
comment on column public.match_notification_log.match_ids is 'UUIDs of matches included in this digest — used to avoid re-sending the same match.';


-- -----------------------------------------------------------------------------
-- 5. Profile columns — notification preferences
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists match_notification_frequency    text        not null default 'off',
  add column if not exists match_notification_last_sent_at timestamptz null;

alter table public.profiles
  drop constraint if exists profiles_match_notification_frequency_chk;

alter table public.profiles
  add constraint profiles_match_notification_frequency_chk check (
    match_notification_frequency in ('off', 'daily', 'weekly')
  );

-- Supports the digest cron: find users due for a send
create index if not exists profiles_match_notification_idx
  on public.profiles (match_notification_frequency, match_notification_last_sent_at)
  where match_notification_frequency != 'off';

comment on column public.profiles.match_notification_frequency    is 'Digest email cadence: off, daily, or weekly.';
comment on column public.profiles.match_notification_last_sent_at is 'Timestamp of the last digest sent. Used by the cron to determine next send time.';


-- -----------------------------------------------------------------------------
-- 6. Helper view — latest intake per user
--    The matching algorithm always uses the most recent intake.
--    Excludes transcript for query performance.
-- -----------------------------------------------------------------------------
create or replace view public.match_intakes_latest as
select distinct on (user_id)
  id,
  user_id,
  emotion,
  intent,
  energy,
  privacy,
  time_horizon,
  free_text_refined,
  topic_hint,
  source_persona,
  locale,
  confidence,
  created_at
from public.match_intakes
order by user_id, created_at desc;

comment on view public.match_intakes_latest is 'Most recent match intake per user. Excludes transcript column for performance.';
