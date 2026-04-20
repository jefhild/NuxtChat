# LinkedAgents Setup

LinkedAgents is useful for a public ImChatty agent that posts a daily journal entry. This integration keeps LinkedAgents as a public activity surface; the existing away-agent system remains responsible for actual user chats.

## What This Adds

- A registration helper at [`scripts/register-linked-agent.mjs`](/Users/jeffhildebrand/Documents/StudioProjects/NuxtChat/scripts/register-linked-agent.mjs)
- A protected automation endpoint at [`server/api/internal/linked-agents/daily-profile.post.ts`](/Users/jeffhildebrand/Documents/StudioProjects/NuxtChat/server/api/internal/linked-agents/daily-profile.post.ts)
- A reusable API utility at [`server/utils/linkedAgents.ts`](/Users/jeffhildebrand/Documents/StudioProjects/NuxtChat/server/utils/linkedAgents.ts)
- A daily GitHub Actions workflow at [`.github/workflows/linked-agents-daily-profile.yml`](/Users/jeffhildebrand/Documents/StudioProjects/NuxtChat/.github/workflows/linked-agents-daily-profile.yml)

## Register The Agent

Run:

```bash
npm run linked-agents:register
```

The command prints `id` and `apiKey`. LinkedAgents only shows the API key once.

## Env Vars

Add these on the server:

```bash
LINKED_AGENTS_ENABLED=true
LINKED_AGENTS_AGENT_ID=uuid_from_registration
LINKED_AGENTS_API_KEY=la_xxx
LINKED_AGENTS_HANDLE=imchatty-agent
LINKED_AGENTS_DESCRIPTION="AI chat companion for anonymous conversation, onboarding, and social discovery."
LINKED_AGENTS_TAGS=ai-companions,anonymous-chat,social-discovery
LINKED_AGENTS_GITHUB_URL=
LINKED_AGENTS_X_URL=
LINKED_AGENTS_REQUEST_TIMEOUT_MS=7000
AUTOMATION_SECRET=shared_secret_for_internal_automation
```

The GitHub workflow reuses repository secret `MOLTBOOK_AUTOMATION_SECRET`. The internal endpoint already accepts the same automation secret used by Moltbook, so you do not need a separate LinkedAgents automation secret unless you intentionally want separate credentials later.

## Daily Profile Post

The automation endpoint:

```bash
curl -X POST "https://imchatty.com/api/internal/linked-agents/daily-profile?dry_run=true" \
  -H "x-automation-secret: YOUR_SECRET" \
  -H "content-type: application/json"
```

It selects one non-private registered public profile, builds a short LinkedAgents journal entry, and posts it with `origin: "agent"`. Anonymous temporary profiles are excluded. Before publishing, it checks recent LinkedAgents journal entries for today's marker so workflow retries do not intentionally post duplicates.

The entry only includes public profile fields: display name, tagline, bio excerpt, AI/member type, and profile URL.

Admins can also run the same post manually from the AI Bots admin screen with the `Run LinkedAgents` button. That calls the admin-only endpoint:

```bash
POST /api/admin/ai-bots/linked-agents/daily-profile
```
