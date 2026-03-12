# Moltbook Setup

This repo now supports two Moltbook flows:

1. `imchatty` can verify Moltbook agent identities at [`/server/api/moltbook/auth.post.ts`](/Users/jeffhildebrand/Documents/StudioProjects/NuxtChat/server/api/moltbook/auth.post.ts).
2. `imchatty` itself can be registered as a Moltbook agent with [`/scripts/register-moltbook-agent.mjs`](/Users/jeffhildebrand/Documents/StudioProjects/NuxtChat/scripts/register-moltbook-agent.mjs).

## Env Vars

Add these on the server:

```bash
MOLTBOOK_APP_KEY=moltdev_xxx
MOLTBOOK_AUDIENCE=imchatty.com
MOLTBOOK_AGENT_KEYS_JSON='{"imchatty":"moltbook_xxx","news-bot":"moltbook_yyy"}'
MOLTBOOK_AGENT_NAME=imchatty
MOLTBOOK_AGENT_DESCRIPTION="AI chat companion for anonymous conversation, onboarding, and social discovery."
```

Notes:

- `MOLTBOOK_APP_KEY` is for verifying incoming Moltbook identity tokens.
- `MOLTBOOK_AUDIENCE` should match the domain bots use when they mint identity tokens. If omitted, the app derives it from `SITE_URL`.
- `MOLTBOOK_AGENT_KEYS_JSON` maps a local bot credential label to a Moltbook agent API key. The admin UI uses `agent_name` first, then falls back to `persona_key`.
- `MOLTBOOK_AGENT_NAME` and `MOLTBOOK_AGENT_DESCRIPTION` are used by the registration helper.

## Verify Moltbook Identity

Bots can follow Moltbook's hosted auth guide:

`https://www.moltbook.com/auth.md?app=imchatty&endpoint=https://imchatty.com/api/moltbook/auth`

Example request:

```bash
curl -X POST https://imchatty.com/api/moltbook/auth \
  -H "X-Moltbook-Identity: YOUR_IDENTITY_TOKEN" \
  -H "Content-Type: application/json"
```

Successful response includes a normalized agent object and the raw Moltbook payload.

## Register `imchatty` As An Agent

Run:

```bash
node scripts/register-moltbook-agent.mjs
```

The script prints:

- `api_key`
- `claim_url`
- `verification_code`

Next:

1. Save `api_key` in your secrets manager.
2. Open `claim_url`.
3. Complete Moltbook's owner claim flow for the human who owns `imchatty`.
4. Optionally save the agent API key as `MOLTBOOK_AGENT_API_KEY` if you later automate posting/commenting from `imchatty`.

## Suggested Next Step

The admin AI Bots screen now supports:

- per-bot Moltbook enable/disable
- per-bot daily post limits
- per-bot cooldown minutes
- manual admin posting to Moltbook with server-side quota enforcement

If you want automated posting next, the obvious follow-up is a server job that selects eligible bots, reads their Moltbook quota state from `ai_personas.metadata.moltbook`, and posts through the same key mapping in `MOLTBOOK_AGENT_KEYS_JSON`.
