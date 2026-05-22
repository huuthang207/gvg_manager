# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

GvG Manager is a two-part TypeScript app:

- `frontend/`: React 19 + Vite UI for Discord OAuth login, guild/member management, attendance, and GvG lineup planning.
- `backend/`: Express API + WebSocket server + Discord bot integration backed by PostgreSQL through Prisma.

The frontend talks to the backend through `VITE_DISCORD_API_URL` (defaults to `http://localhost:3001`). The backend uses Discord OAuth for user login, Discord bot APIs for guild/member sync and attendance buttons/messages, httpOnly `session_id` cookies for session state, and WebSocket updates at `/ws` for realtime app-state/member sync.

## Common commands

Run commands from the relevant package directory.

### Frontend (`frontend/`)

```bash
npm install
npm run dev       # Vite dev server on port 3000, host 0.0.0.0
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # TypeScript check with tsc --noEmit
npm run clean     # Remove dist
```

There is no frontend test script currently configured.

### Backend (`backend/`)

```bash
npm install
npm run dev              # tsx watch src/server.ts
npm run build            # TypeScript compile to dist/
npm start                # Run compiled dist/server.js
npm test                 # Node test runner via tsx over src/**/*.test.ts
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run prisma migrate dev
npm run prisma:migrate:deploy  # Apply migrations in deploy/prod-like environments
```

Run one backend test file with:

```bash
npx tsx --test src/serializers/memberSerializer.test.ts
```

Current backend test files cover member serialization, squad serialization, and attendance rendering.

## Environment

Backend `.env` is based on `backend/.env.example` and expects:

- `DISCORD_BOT_TOKEN` for bot/member APIs; Discord Server Members Intent must be enabled.
- `BOT_INTERNAL_TOKEN` for bot-to-backend internal updates.
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI` for OAuth.
- `FIXED_GUILD_DISCORD_ID` identifies the single Discord server managed by the app; `FIXED_GUILD_NAME` and `ADMIN_DISCORD_USER_ID` allow first-login auto-provisioning in a fresh database.
- `FRONTEND_URL` for OAuth callback redirects.
- `DATABASE_URL` for PostgreSQL.
- `PORT` defaults to `3001` if unset.
- `CORS_ORIGINS` can override allowed frontend origins; otherwise `FRONTEND_URL` or the local Vite origins are used.
- `SESSION_COOKIE_SECURE` and `SESSION_COOKIE_SAME_SITE` control the httpOnly session cookie; use secure `SameSite=None` cookies for cross-site HTTPS deployments.
- `DISCORD_SYNC_FALLBACK_INTERVAL_MS` optionally controls the periodic fallback guild sync interval; the backend defaults to 300000 ms and enforces a minimum of 60 seconds.

Frontend `.env` is based on `frontend/.env.example`; `VITE_DISCORD_API_URL` points to the backend. Set `VITE_REALTIME_DEBUG=true` to log WebSocket activity outside dev mode.

## Architecture notes

### Backend

- `src/server.ts` creates the Express app, enables CORS for the local frontend, installs route modules, starts the HTTP/WebSocket server, starts the Discord bot, and schedules fallback Discord syncs.
- Route modules live under `src/routes/` and are grouped by domain: auth, guilds, members, lineup, settings, attendance, and health.
- Services under `src/services/` hold domain logic such as auth, guild switching, settings, member operations, attendance sessions, lineup edit locks, realtime publishing, and sync orchestration.
- Prisma is initialized through `src/db.ts`; the schema in `prisma/schema.prisma` models users, Discord guilds, memberships/roles, members, lineup teams/slots, squad groups, skills, lineup snapshots, and attendance sessions/votes/channel config.
- Discord integration is split between OAuth/user guild calls (`src/oauth2.ts`), bot/guild member calls (`src/discord.ts`), bot startup/events (`src/bot.ts`), attendance button handling (`src/botAttendance.ts`, `src/services/attendanceDiscordService.ts`), and sync persistence (`src/discordSync.ts`, `src/services/syncService.ts`).
- Authorization is session-based. `src/session.ts` manages the cookie-backed session store, `src/auth.ts` resolves sessions, and `src/permissions.ts` maps guild roles/memberships to app permissions.
- Realtime app-state/member updates are published through `src/services/realtimeGateway.ts`; clients subscribe to a guild over `/ws` and receive member patch/delta events plus app-state change notifications.
- Serializers in `src/serializers/` define API-facing shapes. Existing backend tests cover serializers and attendance rendering.

### Frontend

- `src/App.tsx` is the main state coordinator: auth bootstrap, active guild, permissions, members, skills, squad groups, attendance, and WebSocket subscription lifecycle.
- API calls are organized in `src/services/`; `discordApi.ts` re-exports domain-specific APIs from `authApi.ts`, `guildApi.ts`, `memberApi.ts`, `lineupApi.ts`, `settingsApi.ts`, and `attendanceApi.ts`.
- Shared API/domain types are in `src/services/apiTypes.ts`, `src/shared/types/`, and the legacy aggregate `src/types.ts`.
- Feature UI is grouped under `src/features/`: `auth`, `app`, `guild`, `members`, `lineup`, and `attendance`.
- Lineup state includes squad groups, teams, main/reserve slots, snapshots, and drag/drop behavior via `@dnd-kit`; attendance state includes channel config, active session, recent sessions, and vote summaries.

## Current repository-specific caveats

- There is no root `package.json`; run npm commands from `frontend/` or `backend/`.
- No root `README.md`, backend README, Cursor rules, or GitHub Copilot instructions are present; `frontend/README.md` covers local frontend startup.
- The root directory is the git repository in this environment; `frontend/` also has its own `.gitignore`.
