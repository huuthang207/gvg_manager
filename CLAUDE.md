# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

GvG Manager is a two-part TypeScript app:

- `frontend/`: React 19 + Vite UI for Discord OAuth login, guild/member management, and GvG lineup planning.
- `backend/`: Express API + WebSocket server + Discord bot integration backed by PostgreSQL through Prisma.

The frontend talks to the backend through `VITE_DISCORD_API_URL` (defaults to `http://localhost:3001`). The backend uses Discord OAuth for user login, Discord bot APIs for guild/member sync, httpOnly `session_id` cookies for session state, and WebSocket updates at `/ws` for realtime member sync.

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
```

Run one backend test file with:

```bash
npx tsx --test src/serializers/memberSerializer.test.ts
```

## Environment

Backend `.env` is based on `backend/.env.example` and expects:

- `DISCORD_BOT_TOKEN` for bot/member APIs; Discord Server Members Intent must be enabled.
- `BOT_INTERNAL_TOKEN` for bot-to-backend internal updates.
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI` for OAuth.
- `FRONTEND_URL` for OAuth callback redirects.
- `DATABASE_URL` for PostgreSQL.
- `PORT` defaults to `3001` if unset.

Frontend `.env` is based on `frontend/.env.example`; `VITE_DISCORD_API_URL` points to the backend.

## Architecture notes

### Backend

- `src/server.ts` creates the Express app, enables CORS for the local frontend, installs route modules, starts the HTTP/WebSocket server, starts the Discord bot, and schedules fallback Discord syncs.
- Route modules live under `src/routes/` and are grouped by domain: auth, guilds, members, lineup, settings, and health.
- Services under `src/services/` hold domain logic such as auth, guild switching, settings, member operations, realtime publishing, and sync orchestration.
- Prisma is initialized through `src/db.ts`; the schema in `prisma/schema.prisma` models users, Discord guilds, memberships/roles, members, lineup teams/slots, squad groups, skills, and lineup snapshots.
- Discord integration is split between OAuth/user guild calls (`src/oauth2.ts`), bot/guild member calls (`src/discord.ts`), bot startup/events (`src/bot.ts`), and sync persistence (`src/discordSync.ts`, `src/services/syncService.ts`).
- Authorization is session-based. `src/session.ts` manages the cookie-backed session store, `src/auth.ts` resolves sessions, and `src/permissions.ts` maps guild roles/memberships to app permissions.
- Realtime member updates are published through `src/services/realtimeGateway.ts`; clients subscribe to a guild over `/ws` and receive member patch/delta events.
- Serializers in `src/serializers/` define API-facing shapes and have the existing backend tests.

### Frontend

- `src/App.tsx` is the main state coordinator: auth bootstrap, active guild, permissions, members, skills, squad groups, and WebSocket subscription lifecycle.
- API calls are organized in `src/services/`; `discordApi.ts` re-exports domain-specific APIs from `authApi.ts`, `guildApi.ts`, `memberApi.ts`, `lineupApi.ts`, and `settingsApi.ts`.
- Shared API/domain types are in `src/services/apiTypes.ts`, `src/shared/types/`, and the legacy aggregate `src/types.ts`.
- Feature UI is grouped under `src/features/`: `auth`, `app`, `guild`, `members`, and `lineup`.
- Lineup state includes squad groups, teams, main/reserve slots, snapshots, and drag/drop behavior via `@dnd-kit`.

## Current repository-specific caveats

- The root directory is not currently a git repository in this environment; `frontend/` has its own `.gitignore`.
- The checked-in `frontend/README.md` is the generic AI Studio README, but its local run instructions still apply: install dependencies, set frontend env values, and run `npm run dev`.
- `frontend/.env.example` currently contains duplicate `VITE_DISCORD_API_URL` entries; avoid preserving duplicates when editing that file.
