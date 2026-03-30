# Bot Platform V1 Spec

This document is the working implementation spec for the next stage of the NuxtChat bot system.

Primary goal:
- Build a durable bot architecture that supports many personas, shared capabilities, explicit policy, and moderation.

Reference experiment:
- After `finalizeOnboarding`, `imchatty` hands the user to another public AI bot for a first real chat.
- That bot captures the user's current mood state and stores it through a controlled capability.

This experiment is not just a feature. It is the model for future bot work.

## Why This Spec Exists

The product is moving toward:
- chat-first onboarding
- mood-aware matching
- many public AI bots with different roles
- future bot actions such as profile edits, user search, matchmaking, and enforcement

We do not want each new bot feature to be implemented as a prompt-only special case.

We do want:
- one shared bot platform
- separate persona and capability layers
- explicit permission checks
- auditable writes
- room for enforcement and moderation

## Product Principles

1. `imchatty` is the concierge and orchestrator.
2. Public bots are personas, not independent systems.
3. Bots do not write directly to application tables.
4. Bots call application capabilities.
5. Capabilities enforce policy.
6. Temporary user state and durable profile state are different things.
7. Social bots can observe and flag.
8. Moderation bots or admin flows can enforce.
9. Post-onboarding follow-up should use soft nudges, not fake completion requirements.

## Model Routing Policy

Model choice must be treated as a routing concern, not a global bot setting.

### Core rule

Do not blindly upgrade every bot and every turn to the newest or strongest model.

For this product:
- high-volume chat makes output token cost especially important
- most turns do not need frontier-level reasoning
- better prompts and tighter persona design often matter more than a raw model upgrade

### V1 recommendation

Use per-persona or per-capability model routing.

Examples:
- default social chat: cheaper, fast model
- onboarding and first-impression turns: stronger model if needed
- premium or retention-critical flows: stronger model if justified
- structured extraction or classification: cheapest reliable model

### Pricing and model-positioning note

As of March 27, 2026, official OpenAI pages show:
- `gpt-5.4` as the frontier professional-work model
- `gpt-5 mini` as the low-cost, high-volume modern option

The official pricing pages at that time do not make `gpt-5.4-mini` the default cheap-upgrade recommendation for bulk chat. The safer implementation stance is:
- keep model selection configurable
- test stronger models only where higher output cost is justified
- prefer explicit measurement over blanket upgrades

### Implementation rule

Persona config should support:
- `default_model`
- `fallback_model`
- optional per-capability overrides

Capability routing should support:
- `chat`
- `onboarding`
- `mood_capture`
- `discussion`
- `moderation`

This lets the system evolve without rewriting persona architecture every time model pricing or lineup changes.

## Current Repo Constraints

Current onboarding and auth behavior matters:

- Onboarding currently creates the minimum basic profile through chat.
- `finalizeOnboarding` is the point where the user is created and profile basics are persisted.
- Chat access and profile completion are already partially distinct concepts in the auth store.
- The repo already has AI persona infrastructure, mood-feed infrastructure, and onboarding chat orchestration.

This means mood capture should not become part of the minimum onboarding requirement.

Mood capture should begin after onboarding finalization, using a handoff pattern.

Post-onboarding reminders such as adding a photo, linking an email, setting "looking for", or visiting settings should be treated as optional nudges owned by the receiving bot, not as part of minimum onboarding completion.

### Starter bot convention

For onboarding handoff, V1 should not reuse generic public bots or honey bots.

Instead, define dedicated starter personas in the AI bot admin:
- `starter-feminine`
- `starter-masculine`
- optional `starter-neutral`

These are ordinary AI persona records managed in admin, but they have a stricter product role:
- they complete mood capture
- they own the first suggested next step
- they do not early-exit during onboarding handoff
- they are not `honey` personas

Selection should be:
- explicit handoff override if provided
- otherwise starter persona chosen by simple heuristic
- otherwise safe non-honey public fallback

Current V1 heuristic:
- profile gender `male` -> prefer `starter-feminine`
- profile gender `female` -> prefer `starter-masculine`
- other/unknown -> prefer `starter-neutral`

This is only a soft routing rule and should be easy to replace with preference-based routing later.

## Core Terms

### Persona

A bot identity with a name, tone, role, and policy scope.

Examples:
- `imchatty`
- a playful public bot
- a calm reflective bot
- a moderator persona

Personas define:
- voice
- role
- handoff behavior
- allowed capabilities

Personas do not define:
- direct database writes
- business logic
- authorization rules by themselves

### Capability

A structured application action that a bot may request.

Examples:
- `handoff_to_persona`
- `set_live_mood_state`
- `set_mood_preferences`
- `search_users_by_filters`
- `update_user_profile_field`
- `create_flag`
- `apply_feature_restriction`

Capabilities must have:
- stable name
- input schema
- output schema
- policy check
- audit logging

### Policy

The rules that determine whether a persona may use a capability for a given target and context.

Policy decides:
- which persona may call which capability
- whether the user may request it
- whether confirmation is required
- whether the action is visible, private, or forbidden

### Live Mood State

Temporary session-like data describing the user's current headspace.

Examples:
- emotion
- intent
- energy
- privacy
- time horizon

This data expires.

### Mood Preferences

Durable defaults controlling how the mood system should behave for the user.

Examples:
- default privacy
- allow mood matching
- allow bot intros
- show profile aura
- preferred conversation styles

This data persists until changed.

## Bot Roles

V1 should support the following conceptual roles.

### 1. Concierge

Primary persona:
- `imchatty`

Responsibilities:
- consent and onboarding
- finalize onboarding
- explain the app
- route the user to the next persona
- recover broken flows

Allowed examples:
- `handoff_to_persona`
- `get_user_profile_summary`
- `set_onboarding_state`

Not allowed:
- direct enforcement actions like suspension or deactivation

### 2. Conversation Persona

Primary examples:
- public AI bots the user can chat with

Responsibilities:
- behave like a real chat partner
- collect live mood state naturally
- optionally collect mood defaults when explicitly stated
- optionally ask clarifying questions

Allowed examples:
- `get_user_profile_summary`
- `get_live_mood_state`
- `set_live_mood_state`
- `set_mood_preferences`
- `create_flag`

Not allowed:
- editing unrelated users
- direct suspension or account deactivation

### 3. Discussion Persona

Primary examples:
- editorial bot
- counterpoint bot
- explainer bot
- thread host bot

Responsibilities:
- participate in forum-like or feed-like discussions
- summarize context
- add perspective
- challenge consensus when appropriate
- keep discussion moving without acting as an unrestricted system actor

Allowed examples:
- `create_discussion_reply`
- `summarize_thread`
- `offer_counterpoint`
- `create_flag`

Not allowed:
- unrestricted user search
- unrestricted profile editing
- direct enforcement actions unless explicitly upgraded into a moderator role

### 4. Matchmaker

May be a separate persona later or a capability mode.

Responsibilities:
- search users by compatible state
- suggest introductions
- power mood map and compatibility features

Allowed examples:
- `search_users_by_filters`
- `suggest_matches`
- `create_intro`

### 5. Moderator

May be bot-assisted, not necessarily user-facing.

Responsibilities:
- evaluate flags
- inspect moderation history
- apply restrictions
- escalate to review

Allowed examples:
- `read_flag_summary`
- `apply_chat_restriction`
- `apply_feature_restriction`
- `suspend_account`
- `deactivate_account`
- `queue_manual_review`

### 6. Admin / Enforcement

Responsibilities:
- manual override
- review decisions
- restore accounts
- adjust policy thresholds

### Special Interaction Modes

Some existing bot types are better modeled as interaction modes rather than top-level architecture categories.

Examples:
- `honey`
- `editorial`
- `counterpoint`

These are not redundant, but they should be classified carefully.

Recommended classification:

- `editorial` and `counterpoint`
  - best treated as discussion personas or discussion capability bundles
- `honey`
  - best treated as a policy-constrained interaction mode that may be attached to a persona

`honey` should not be the name of a separate architecture. It is a controlled behavior mode with special rules.

For example, `honey` may define:
- whether a bot may initiate
- whether it appears only after authentication or only after `anon_authenticated`
- response delay rules
- cooldown rules
- eligibility filters
- visibility restrictions

This means `honey` is safe to keep, but it should be reclassified as:
- a persona mode
- or a capability/policy bundle

It should not remain only a prompt label with hidden behavioral assumptions.

## V1 Reference Experiment

The first implementation should validate the architecture using one narrow flow.

### Flow

1. `imchatty` completes `finalizeOnboarding`.
2. `imchatty` chooses a target public bot `X`.
3. `imchatty` calls `handoff_to_persona`.
4. `X` receives structured handoff context.
5. `X` starts a real first-chat conversation.
6. `X` captures the user's current mood state.
7. `X` calls `set_live_mood_state`.
8. Optional:
   - if the user expresses a durable default such as "keep this private," `X` may call `set_mood_preferences`.
9. After mood capture, `X` may deliver one soft nudge such as:
   - add a photo
   - set what the user is looking for
   - link an email
   - open settings

### Success Criteria

The experiment is successful if:
- the handoff feels coherent to the user
- `X` feels like a real persona, not a form
- mood data is stored through capabilities rather than direct writes
- policy boundaries are respected
- the stored mood data can later support matching and visualization

## User-Facing Mood Taxonomy

V1 frontend taxonomy:

- `emotion`
  - lonely
  - calm
  - annoyed
  - overwhelmed
  - playful
  - curious
  - hopeful
  - sad

- `intent`
  - be heard
  - listen
  - distract me
  - deep talk
  - casual chat
  - meet someone similar

- `energy`
  - drained
  - normal
  - wired

- `privacy`
  - public mood post
  - private matching only

- `time_horizon`
  - right now
  - today
  - generally lately

This is the user-facing layer.

Internally, V1 may later map these values to a more structured affect model, but that is not required for the first implementation.

## Data Model

V1 should separate temporary mood state from durable user defaults.

### `live_mood_states`

Purpose:
- temporary state used for matching, visualization, and session context

Recommended fields:
- `id`
- `user_id`
- `emotion`
- `intent`
- `energy`
- `privacy`
- `time_horizon`
- `free_text_raw`
- `free_text_refined`
- `source_persona`
- `source_type`
  - self_selected
  - bot_inferred
  - mixed
- `confidence`
- `captured_at`
- `expires_at`
- `created_at`
- `updated_at`

Rules:
- only one active state should normally exist per user
- new writes should replace or supersede the current active state
- state should expire automatically

### `mood_preferences`

Purpose:
- user defaults that influence behavior over time

Recommended fields:
- `user_id`
- `allow_mood_matching`
- `allow_bot_intro`
- `default_mood_privacy`
- `show_profile_aura`
- `preferred_intents`
- `updated_at`

Rules:
- only durable preferences belong here
- current mood never belongs here

### `bot_handoffs`

Purpose:
- track persona transitions and why they happened

Recommended fields:
- `id`
- `user_id`
- `from_persona`
- `to_persona`
- `reason`
- `context_summary`
- `created_at`

### `moderation_flags`

Purpose:
- record incidents, reports, or automated triggers

Recommended fields:
- `id`
- `target_user_id`
- `reporter_user_id`
- `source_persona`
- `trigger_type`
  - user_report
  - automated
  - bot_observation
- `reason_code`
- `severity`
- `evidence_summary`
- `status`
  - open
  - reviewed
  - dismissed
  - escalated
- `created_at`
- `updated_at`

### `account_restrictions`

Purpose:
- store active enforcement decisions

Recommended fields:
- `id`
- `user_id`
- `restriction_type`
  - warn
  - rate_limit
  - feature_restrict
  - suspend
  - deactivate
- `scope`
  - chat
  - matching
  - mood_feed
  - global
- `reason_code`
- `applied_by_type`
  - moderator_bot
  - admin_user
  - system
- `applied_by_id`
- `expires_at`
- `created_at`

### `bot_action_logs`

Purpose:
- audit capability execution

Recommended fields:
- `id`
- `actor_persona`
- `capability`
- `actor_user_id`
- `target_user_id`
- `request_summary`
- `result_summary`
- `status`
- `created_at`

## Capability Registry

V1 should define capabilities explicitly even if only a subset is implemented first.

### User and Profile

- `get_user_profile_summary`
- `update_user_profile_field`
- `get_mood_preferences`
- `set_mood_preferences`
- `get_live_mood_state`
- `set_live_mood_state`

### Persona and Routing

- `handoff_to_persona`
- `get_persona_summary`

### Matching

- `search_users_by_filters`
- `suggest_matches`
- `create_intro`

### Discussion

- `create_discussion_reply`
- `summarize_thread`
- `offer_counterpoint`
- `suggest_followup_question`

### Moderation

- `create_flag`
- `read_flag_summary`
- `apply_chat_restriction`
- `apply_feature_restriction`
- `suspend_account`
- `deactivate_account`
- `queue_manual_review`

## Policy Matrix

This matrix should exist in code, not only in prompts.

### `imchatty`

Can:
- finalize onboarding
- read current user profile summary
- initiate handoff
- request mood capture
- explain app behavior

Cannot:
- directly suspend or deactivate accounts
- search private user state beyond normal policy limits

### Public Conversation Bot

Can:
- read current user profile summary
- read current user's live mood state
- write current user's live mood state
- write mood preferences only when explicitly indicated by the user
- create moderation flags

Cannot:
- edit unrelated users
- suspend or deactivate accounts
- bypass privacy settings

### Discussion Persona

Can:
- participate in thread or forum discussion
- summarize context
- offer editorial framing or counterpoint
- flag inappropriate content

Cannot:
- act as a moderator unless explicitly assigned moderation capabilities
- edit user data outside approved capability scope

### Matchmaker

Can:
- read eligible user summaries
- search users by public or allowed matching filters
- suggest introductions

Cannot:
- expose private mood state to ineligible viewers
- override restriction rules

### Moderator

Can:
- inspect moderation evidence
- apply restrictions
- escalate to review

Cannot:
- freely act as a social chat bot unless explicitly designed for that mode

### Admin

Can:
- review, override, restore, and tune policy

### Honey Mode

`honey` should be governed by explicit policy rather than informal prompt behavior.

Examples of `honey` policy fields:
- `enabled`
- `eligible_auth_states`
- `allowed_entry_points`
- `min_delay_ms`
- `max_delay_ms`
- `cooldown_ms`
- `may_initiate`
- `requires_recent_user_activity`
- `visibility_scope`

Key rule:
- a bot in `honey` mode is still a persona using capabilities under policy
- `honey` mode does not bypass safety, audit, privacy, or moderation constraints

## Handoff Contract

Persona handoffs should be structured events, not just prompt transitions.

### `handoff_to_persona` Input

Required:
- `user_id`
- `from_persona`
- `to_persona`
- `reason`

Suggested handoff context:
- `displayname`
- `bio`
- `preferred_locale`
- `onboarding_just_completed`
- `allowed_capabilities`
- `suggested_opening_style`
- `current_user_summary`
- `nudges`
  - `nudge_add_photo`
  - `nudge_link_email`
  - `nudge_set_looking_for`
  - `nudge_open_settings`

### Handoff Rules

- the receiving persona must know the handoff happened
- the receiving persona must not repeat onboarding questions
- the receiving persona should open naturally
- the handoff must be logged
- the receiving persona should ask for mood first and delay soft nudges until after the first exchange

## Conversation Design for the Reference Experiment

After onboarding completion:

1. `imchatty` confirms the user is set up.
2. `imchatty` introduces bot `X`.
3. `X` opens as a conversational partner.
4. `X` captures current mood through natural conversation.
5. `X` delivers at most one soft nudge after the first mood exchange, if useful.

### Good opening shape

Examples:
- "Hey, glad to meet you. What kind of headspace are you in right now?"
- "Nice to meet you. Are you looking for quiet company, a laugh, or something deeper?"

### Bad opening shape

Avoid:
- re-asking onboarding questions
- form-like interrogation
- pretending it updated data when it did not
- dumping multiple profile reminders at once

## Hard Requirements vs Soft Nudges

These are different categories and should not be mixed.

### Hard requirements

These are the fields and checks the system truly needs in order to create the user and let the onboarding flow complete.

Examples:
- minimum identity/profile fields required by the onboarding flow

### Soft nudges

These improve trust, matching quality, or retention, but they are not obligations.

Examples:
- add a photo
- link an email
- set what the user is looking for
- open settings
- share current mood

Implementation rule:
- hard requirements belong to onboarding and auth flow
- soft nudges belong to post-onboarding bot behavior

## Moderation Model

Moderation must be first-class from V1.

### Enforcement Ladder

Recommended progression:

1. `warn`
2. `rate_limit`
3. `feature_restrict`
4. `temporary_suspend`
5. `deactivate`
6. `manual_review_only`

### Key Rule

- social bots can observe and flag
- moderator bots can enforce
- admins can override

### Example Scopes

Feature restrictions may target:
- initiating chat
- appearing in matching
- using the mood feed
- public posting

This is preferable to immediate full deactivation in many cases.

## Future Discussion Forum Support

The V1 architecture is intended to support future forum or discussion-thread participation.

That future should be modeled with:
- discussion personas
- discussion capabilities
- policy-scoped participation rules

Examples:
- `editorial` introduces topic context
- `counterpoint` offers disagreement or alternative framing
- `host` asks clarifying or energizing follow-ups
- `moderator` enforces rules and cools down threads

This means older bot classifications such as `editorial` and `counterpoint` are not obsolete.

They should be preserved, but reclassified from:
- ad hoc bot type labels

to:
- discussion persona roles
- or discussion capability bundles governed by policy

The same applies to `honey`:
- keep the feature
- reclassify it as a policy-controlled interaction mode
- ensure it uses the same orchestrator, capability, and audit layers as every other bot behavior

## V1 API and Runtime Shape

The runtime target is:

`BotRequest -> Orchestrator -> Policy -> Capability -> Audit Log -> Bot Response`

### Orchestrator Responsibilities

- resolve active persona
- package structured context
- call policy checks
- execute approved capabilities
- store audit logs
- return normalized results to the bot response layer

### Context Rules

Do not pass the full application state to every persona call.

Pass a structured context packet with:
- actor user
- active persona
- profile summary
- live mood summary
- current restriction summary
- recent relevant bot actions

## Implementation Phasing

### Phase 1

Reference experiment only:
- define persona roles
- add capability registry skeleton
- add policy skeleton
- add `live_mood_states`
- add `mood_preferences`
- add `bot_handoffs`
- implement post-onboarding handoff from `imchatty` to a public bot
- implement `set_live_mood_state`

### Phase 2

Add matching and visualization support:
- `suggest_matches`
- `search_users_by_filters`
- mood map
- pulse bar
- profile aura

### Phase 3

Add moderation enforcement:
- `moderation_flags`
- `account_restrictions`
- moderator persona or admin-backed enforcement workflow

## Non-Goals for V1

V1 should not try to solve all of the following:
- complete research-grade emotion science
- full autonomous moderation
- complex multi-bot arbitration
- direct profile editing by all personas
- final production-grade matching algorithms

V1 is about getting the architecture right while shipping one real path.

## Immediate Build Decisions

These decisions are locked for V1 unless a better constraint emerges during implementation.

1. `imchatty` remains the onboarding and routing persona.
2. A second public bot is introduced after onboarding finalization.
3. Mood capture is stored as `live_mood_state`, not as direct profile identity.
4. Durable defaults go into `mood_preferences`.
5. Capabilities mediate all writes.
6. Moderation exists as a separate role from social conversation.

## Open Questions

These should be resolved during implementation planning, not before this spec is accepted.

1. Which specific public bot should be the first handoff target?
2. Should the first handoff bot be fixed or selected by simple rules?
3. How long should `live_mood_state` remain active by default?
4. What matching visibility is allowed when privacy is `private matching only`?
5. Which restrictions should hide a user from matching versus fully suspend chat?

## Source Files Likely Touched During Implementation

Current likely integration points:
- `composables/useOnboardingAi.js`
- `composables/useOnboardingOrchestrator.js`
- `stores/onboardingDraftStore.js`
- `stores/authStore1.js`
- `server/api/aiOnboarding.js`
- `server/utils/aiBots.ts`
- `server/utils/openaiGateway.js`
- `composables/useFetchOnlineUsers.js`
- mood feed utilities and admin surfaces if reused for storage or moderation

This document should be treated as the implementation reference for the first build unless superseded by a narrower change request.
