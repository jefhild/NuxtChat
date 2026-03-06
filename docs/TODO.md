# TODO

Short, code-level tasks that are easy to execute in one sitting.

## Now

- [x] [P1] [api] Lock down `/api/admin/ai-bots/*` and `/api/admin/engagement-rules/*` with server-side admin checks. (2026-03-05)
- [x] [P1] [db] Add multi-capability bot schema for one profile identity with many capabilities (`editorial`, `counterpoint`, `honey`) and per-capability routing/delay settings. (2026-03-05)
- [x] [P1] [admin] Update AI Bots admin flow to support assigning capabilities to existing profiles plus per-capability prompts and toggles. (2026-03-05)
- [x] [P1] [chat] Add honey DM trigger path for `anon_authenticated` users with randomized response delay range (default 1-10s). (2026-03-05)
- [x] [P1] [api] Route bot selection by context/capability (rewrite uses `editorial`, discussion uses `counterpoint`, DM uses `honey`) while keeping ImChatty special-cased. (2026-03-05)
- [ ] [P1] [profiles] Keep bot-capable profiles fully user-like (photos, bio, age, gender, visibility) and add a public-listing toggle separate from capabilities.
- [ ] [P2] [ux] Add a Browse Profiles Section
- [ ] [P2] [ui] Mood Feed UI is ugly
- [ ] [P3] [ux] Mood Feed Teaser to Home Page


## Next
- [ ] [P2] [chat] Audit selected-user header truncation on very long names/taglines.
- [ ] [P3] [cleanup] Reduce noisy eslint warnings in touched files.

## Done
- [x] [P1] [profiles] Remove country column and show flag on avatar in `/profiles` (2026-02-23).
- [x] [P1] [profiles] Verify avatar flag placement on `/profiles` at desktop breakpoints.
- [x] [P2] [db] Add migration file for `messages_v2_reply_to_message_id_fkey` with `ON DELETE SET 
- [x] [P2] [db] Profile image change not persisting outside edit mode.

- [x] [P2] [ux] Add empty-state copy for profile tagline when missing.
- [x] [P2] [ui] Full Profile Display is ugly. make it like a playing card
- [x] [P2] [ui] When someone tries to logout with an email, insist.
- [x] [P2] [ui] embed instagram and youtube in Articles page



## Conventions
- Use priority: `P1` (urgent), `P2` (normal), `P3` (nice-to-have).
- Use tags like: `ui`, `db`, `api`, `auth`, `perf`, `cleanup`.
- Keep tasks small; move larger requests to `docs/CHANGE_REQUESTS.md`.
