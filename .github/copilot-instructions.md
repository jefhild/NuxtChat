# Copilot Instructions

## Commands

```bash
npm run dev          # Dev server at localhost:3000
npm run build        # Production build (allocates 6GB heap)
npm run start        # Run production build
npm run rebuild      # Full clean + rebuild
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run lint:strict  # ESLint with zero-warnings tolerance
npm run clean        # Remove node_modules, build artifacts, cache
```

There is no test suite — no testing framework is configured.

## Architecture

**Stack:** Nuxt 3 (SSR) · Vue 3 · Vuetify 3 · Pinia · Supabase (PostgreSQL + Auth + Realtime) · Nitro API routes · OpenAI (model configurable via `OPENAI_MODEL`, defaults to `gpt-4.1-mini`) · @nuxtjs/i18n

This is an anonymous chat platform where users chat with real people and AI personas. Key feature areas:

- **Real-time chat** — Supabase WebSocket subscriptions for messages, typing indicators, and presence
- **AI personas** — OpenAI-powered characters users can chat with
- **Onboarding** — Multi-step AI-guided profile creation flow for new anonymous users
- **Mood feed** — Prompt-based discovery for starting conversations
- **Profiles/People** — Public user profiles with avatars, decorations, and taxonomies
- **Articles/Topics** — Content from external sources (Newsmesh integration)
- **Admin panel** — `/admin/` routes protected by `profiles.is_admin` flag

**SQL migrations** live in `/SQL/` (42 files). Apply in order: `create.sql` → `functions.sql` → `init.sql`, then numbered migrations.

## Conventions

### File naming
- Components: PascalCase in feature folders (`Chat/Layout/Regular.vue`, `Login/Form.vue`)
- Composables: `use` prefix, camelCase (`useChatSession.js`, `useAuthFlow.js`)
- Stores: camelCase (`authStore1.js`, `chatStore.js`)
- Pages: kebab-case matching URL (`chat-without-signup.vue`)
- API routes: camelCase with HTTP method suffix (`aiChat.post.js`, `ai-personas.get.ts`)

### File types: JS vs TS
Most composables are `.js`; server utilities, critical path files, and newer composables use `.ts`. Both coexist — match the extension of the file you're editing.

### Components
All components use `<script setup>` with Composition API. Vuetify components (`v-card`, `v-dialog`, `v-btn`, etc.) are used throughout for layout and UI. Use Vuetify breakpoint utilities (`d-md-none`, `d-sm-block`) for responsive behavior.

### State management (Pinia)
8 stores — some use Options API (`authStore1`, `notificationStore`), some use Composition API (`chatStore`, `typingStore`). Match the existing style of whichever store you're editing.

**Auth states in `authStore1`:** `unauthenticated` → `guest` → `onboarding` → `anon_authenticated` → `authenticated`

### Data access
- **Client-side DB queries:** always use the `useDb()` composable (wraps the Supabase client)
- **Complex/sensitive operations:** Nitro API routes in `/server/api/` (31 endpoints)
- **Realtime:** Supabase channel subscriptions via `useDb()`, managed inside composables
- **OpenAI:** server-side only via `openaiGateway` in `/server/utils/openaiGateway.js`

### Authentication
Supabase Auth with PKCE flow. OAuth providers: Google, Facebook. Server middleware `00.auth-cookie-guard.ts` validates tokens and blocks injection attacks. The `redirectOptions.exclude` list in `nuxt.config.ts` controls which routes skip auth redirect — when adding a new public route, add **both** the bare path (`/my-route`) and all 4 locale-prefixed variants (`/en/my-route`, `/fr/my-route`, `/ru/my-route`, `/zh/my-route`).

### Server middleware
- `server/middleware/00.auth-cookie-guard.ts` — validates auth tokens, blocks injection attacks (runs on all API requests)
- `server/middleware/00.i18n-bot-root.ts` — redirects i18n bot traffic at the root

### i18n
Strategy: `prefix_except_default` (English is default/no prefix; others use `/fr`, `/ru`, `/zh`). Translation files are lazy-loaded JSON in `/i18n/locales/`. Use `$t('pages.section.key')` in templates and `useI18n()` in `<script setup>`. Always add keys to all 4 locale files (`en-US.json`, `fr-FR.json`, `ru-RU.json`, `zh-CN.json`).

### Environment variables
Public vars (safe for client) go in `runtimeConfig.public`; private vars (API keys, service role key) go in `runtimeConfig` in `nuxt.config.ts`. Never access private vars client-side.

### Special constants
`IMCHATTY_ID = "a3962087-516b-48df-a3ff-3b070406d832"` is the hardcoded UUID for the ImChatty AI persona. It's referenced in several composables and stores and receives special-case routing in the AI chat pipeline.

### Utility directories
- `lib/` — low-level DB helpers (`dbUtils.ts`, `supabaseHelpers.ts`); not for UI logic
- `utils/` — pure utility functions (slug formatters, sanitizers, SEO path builders); no Nuxt/Vue composables here

### Task tracking
Short code-level tasks go in `docs/TODO.md`; larger cross-cutting features go in `docs/CHANGE_REQUESTS.md`. Use priority tags `[P1]`/`[P2]`/`[P3]` and area tags like `[ui]`, `[db]`, `[api]`, `[auth]`.

### Common patterns

**Adding a public route** — Create the page, then add to `redirectOptions.exclude` in `nuxt.config.ts` with both the bare path AND all locale-prefixed variants (already shown above under Authentication).

**New API route:**
```ts
// server/api/myRoute.post.ts
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  const body = await readBody(event);
  // ...
  return { success: true, data: result };
});
```

**Realtime subscription (in a composable):**
```js
const channel = useDb().getClient()
  .channel('room-name')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
    messages.value.push(payload.new);
  })
  .subscribe();
// Always clean up: onUnmounted(() => channel.unsubscribe())
```

### Contributing
- PRs target the `opensource` branch, not `main`
- Branch naming: `feature-your-feature-name`
- Use `git pull --rebase` — no merge commits
- Keep PRs small and focused (one topic per PR)
