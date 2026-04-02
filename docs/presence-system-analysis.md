# Presence System Analysis

> Reviewed: 2026-04-02  
> Status: Issues identified, fixes not yet implemented

---

## Architecture Overview

### Storage (two sources of truth — needs consolidation)

| Table | Key Fields | Updated By |
|-------|-----------|------------|
| `presence` | `user_id`, `status`, `last_seen_at`, `manual_status` | `touchPresence()` every 60s |
| `profiles` | `last_active` | `updateLastActive()` every 5min heartbeat |

### Realtime Channel
- Channel name: `"presence:global"` (Supabase Realtime presence API)
- Set up in: `stores/presenceStore2.js`
- Two modes: `connect(userId)` for authenticated users (tracks self), `observe()` for guests (listen-only)

### Data Flow

```
User authenticates
    ↓
layouts/default.vue → setPresenceForUserId(userId) [line 509]
    ↓
presenceStore2.connect(userId)
    - Creates "presence:global" Supabase Realtime channel
    - Calls channel.track({ status, online_at })
    - Subscribes to sync/join/leave events → _rebuild() → onlineUsers[]
    ↓
startPresenceTouch(userId) — every 60s
    - useDB.touchPresence() → upserts presence.last_seen_at
    - upserts profiles.last_active
    ↓
usePresenceHeartbeat — every 5min
    - useDB.updateLastActive()
```

### Chat List Display
- **Component**: `components/Chat/Layout/index.vue` (computed `usersWithPresence`, lines 2501–2650)
- **Presence priority**: manual_status → AI always-online → isRealtimeOnline → isRecentActive (away) → offline
- **Recent active poll**: `/api/presence/recent?minutes=10` — runs every **5 minutes**
- **User list render**: `components/Chat/Layout/UserList.vue`

---

## Issues Identified

### 🔴 Critical

**1. No WebSocket reconnection logic**
- `presenceStore2.js` subscribes once with `__didSubscribe` guard preventing re-subscribe
- If Supabase Realtime WebSocket drops (sleep, network switch, mobile), it never reconnects
- Affected users stay frozen in their last-known state indefinitely for other users
- **Fix needed**: Detect channel disconnect and call `leave()` + `connect()` again with backoff

**2. Manual status changes not broadcast to other users**
- `setStatus()` in `presenceStore2.js` updates the DB but the Realtime channel only reflects it locally
- Other users must refresh to see status changes
- **Fix needed**: After updating DB, call `channel.track()` with new status so Realtime propagates it

### 🟡 Medium

**3. Two diverging presence sources**
- `presence.last_seen_at` and `profiles.last_active` can drift
- `/api/presence/recent.get.js` blends both with OR logic (lines 39–44)
- Can cause online/away flicker
- **Fix needed**: Standardize on one table; remove the other from presence queries

**4. `last_active` type mismatch**
- `useDB.js:1451` writes JS `Date` object
- `layouts/default.vue:1177` writes ISO string
- Query in `presence/recent.get.js` treats it as bare TIMESTAMP (no TZ)
- Silent failures likely; some heartbeat updates may not register
- **Fix needed**: Standardize to `TIMESTAMPTZ` + always write `.toISOString()`

**5. 5-minute poll interval for recent active**
- A user going offline can take up to 5 minutes to disappear
- A returning user takes up to 5 minutes to appear as "away"
- **Fix needed**: Reduce to 90–120 seconds, or drive from Realtime leave events

**6. Manual status visible to self only until peer refreshes**
- Same root as #2 above; manual_status in `usersWithPresence` reads from local user object, not Realtime broadcast

---

## Key Files

| File | Purpose |
|------|---------|
| `stores/presenceStore2.js` | Core Realtime presence store — connect/observe/rebuild |
| `layouts/default.vue:509–563` | `setPresenceForUserId()` — wires up presence on auth |
| `layouts/default.vue:480–494` | `startPresenceTouch()` — 60s DB heartbeat |
| `composables/usePresenceHeartbeat.js` | 5-min `updateLastActive()` heartbeat |
| `composables/useDB.js:1168–1185` | `touchPresence()` — upserts both tables |
| `composables/useDB.js:1451–1461` | `updateLastActive()` — profiles table only |
| `components/Chat/Layout/index.vue:2501–2650` | `usersWithPresence` computed — status priority logic |
| `components/Chat/Layout/UserList.vue` | Renders presence dot |
| `server/api/presence/recent.get.js` | Recent active API — blends presence + profiles |
| `SQL/create.sql:215–223` | `presence` table schema |

---

## Recommended Fix Order

1. Fix `last_active` type mismatch (low risk, unblocks reliable DB presence)
2. Add reconnection logic to `presenceStore2.js` (fixes frozen presence after drops)
3. Broadcast manual status via `channel.track()` (fixes refresh-required status changes)
4. Consolidate to single presence source (reduce poll noise and drift)
5. Reduce poll interval to 90s (improves offline detection speed)
