# Multi-server SaaS Implementation Progress

Last updated: 2026-05-28

## Current status

Phase 09 frontend onboarding and Phase 10 multi-guild hardening are implemented and validated by local backend/frontend checks plus browser smoke testing against local Discord OAuth/bot config. Billing APIs/UI, app shell subscription/admin state, system admin dashboard frontend, and onboarding backend were already present and are now reflected in the phase table.

## Overall progress

| Phase | Status | Notes |
|---|---|---|
| Phase 01 — Schema và migration | Done | Added system admin, subscription, payment, audit log models, guild onboarding metadata, env defaults, and migration backfill. Backend generate/typecheck/tests/build pass; reset dev DB migration deploy/status pass. |
| Phase 02 — Auth multi-server | Done | Removed fixed-guild login gating, added system admin bootstrap/auth metadata, allowed authenticated empty app state, and added frontend no-guild/lost-access states. Backend build/tests and frontend lint/build pass. |
| Phase 03 — Subscription service và backend gating | Done | Added subscription/billing services, default 30-day ACTIVE policy for new guilds, app-state subscription metadata, and backend mutation gating for expired/suspended guilds. |
| Phase 04 — System admin backend APIs | Done | Added system admin auth helper, overview/guild/user/audit APIs, payment/suspend/unsuspend/force-sync commands, and audit logging. |
| Phase 05 — Guild billing APIs | Done | Added guild billing current/history APIs and frontend billing view/history/instructions. |
| Phase 06 — App state và frontend shell | Done | App state and shell consume subscription/system admin/onboarding metadata, guild switcher, billing banner, and admin entry. |
| Phase 07 — System admin dashboard frontend | Done | Added admin overview, guild list/detail, payment, users, and audit log screens. |
| Phase 08 — Guild onboarding backend | Done | Added available guilds/connect/bot invite/provisioning/onboarding-state/complete APIs. |
| Phase 09 — Guild onboarding frontend | Done | Added guild picker, bot invite retry, connected-guild setup checklist, completion CTA, and no-guild onboarding shell. |
| Phase 10 — Multi-server cleanup và hardening | Done | Hardened websocket guild subscription authorization, target-guild import authorization, inactive bulk delete gating, and active-guild frontend sync. |
| Phase 11 — Validation, tests và rollout | In progress | Local backend/frontend validation and browser smoke testing pass; broader rollout checklist remains before marking Done. |

## Status legend

- `Not started`: chưa triển khai.
- `In progress`: đang triển khai.
- `Blocked`: đang bị chặn bởi quyết định, lỗi môi trường hoặc dependency.
- `Ready for validation`: code đã xong, chờ test/manual validation.
- `Done`: đã pass validation.

## Decisions

- MVP subscription price: 129.000 VND/server/month.
- MVP billing mode: manual payment recorded by system admin.
- MVP plan code: `gvg-monthly-129k`.
- New guild subscription policy: `ACTIVE` by default for 30 days.
- Subscription is per Discord guild/server, not per user.
- Backend must enforce subscription gating; frontend disabled UI is only convenience.
- System admin dashboard manages all server tenants.

## Open questions before implementation

1. Trial policy for new guilds:
   - 7-day trial, or
   - active 30 days by default, or
   - expired until manually paid?
2. Which Discord users should be bootstrapped as system admins in `SYSTEM_ADMIN_DISCORD_USER_IDS`?
3. Payment instruction content for the guild billing page.
4. Whether admin dashboard should be a tab inside current app shell first, or route-like separate view.

## Phase notes

### Phase 10 — Multi-server cleanup và hardening

- Added target-guild access helpers in `backend/src/permissions.ts` so explicit guild operations can authorize the requested guild instead of the session active guild.
- Hardened websocket `subscribe_guild` handling in `backend/src/services/realtimeGateway.ts`; unauthorized guild subscriptions now return `subscription_error` and do not update socket metadata.
- Updated existing guild import authorization in `backend/src/routes/guildRoutes.ts` to check `manage:settings` on the target guild, while preserving owner override and subscription gating.
- Added missing subscription mutation guard to bulk inactive member deletion in `backend/src/services/memberService.ts`.
- Synchronized frontend active guild state from app-state application, guild switching, and logout reset paths.
- Validation run:
  - `npm --prefix backend test`: pass.
  - `npm --prefix backend run build`: pass.
  - `npm --prefix frontend run lint`: pass.
  - `npm --prefix frontend run build`: pass with existing Vite chunk-size warning.

### Phase 09 — Guild onboarding frontend

- Added onboarding frontend API contracts and client helpers for available guilds, connect, onboarding state, and complete endpoints.
- Added `frontend/src/features/onboarding/OnboardingView.tsx` with full-page no-guild onboarding, Discord guild picker, bot invite/retry state, connected-guild setup checklist, and completion CTA.
- Added `frontend/src/features/onboarding/useGuildOnboarding.ts` to manage available guild loading, connect results, bot-required retry, checklist state, and complete flow.
- Integrated onboarding into `frontend/src/App.tsx` for authenticated no-guild states and owner guilds with incomplete onboarding.
- Validation run:
  - `npm --prefix frontend run lint`: pass.
  - `npm --prefix frontend run build`: pass with existing Vite chunk-size warning.
- Browser smoke test with local Discord OAuth confirmed logged-out screen, Discord authorization redirect, no-guild onboarding screen, manageable guild picker, bot-missing invite CTA, bot-present connect, and app-shell entry for `Nguyệt Miêu Lâu`.

### Phase 08 — Guild onboarding backend

- Added backend onboarding APIs for listing available Discord guilds, connecting/provisioning guilds, bot invite-required response, onboarding state, and onboarding completion.
- Added short session cache for available guild listing to avoid duplicate frontend loads exhausting Discord API rate limits.
- New guild connection provisions owner membership, subscription, initial sync, active session guild, app state, and audit log.

### Phase 07 — System admin dashboard frontend

- Added frontend admin dashboard screens for overview, guild list/detail, payment recording, suspend/unsuspend, force sync, user listing, and audit logs.

### Phase 06 — App state và frontend shell

- Frontend shell now consumes subscription metadata, system admin role, onboarding state, accessible guilds, active guild selection, billing banner/badge, and admin tab entry.

### Phase 05 — Guild billing APIs

- Added guild billing current/history APIs and frontend billing view with payment instructions, current status, and payment history.

### Phase 04 — System admin backend APIs

- Added `backend/src/http/requireSystemAdmin.ts` with SUPPORT/ADMIN/OWNER hierarchy.
- Added `backend/src/services/auditLogService.ts` for audit log creation and filtered listing.
- Added admin subscription helpers for suspend/unsuspend and force-sync support that persists `lastSyncError`.
- Added `backend/src/services/adminService.ts` for overview, guild list/detail, payment recording, suspend/unsuspend, force sync, users, and audit log queries.
- Added `backend/src/routes/adminRoutes.ts` and registered it in `backend/src/server.ts`.
- Mutating admin commands write audit logs for payment recorded, subscription extended, guild suspended, guild unsuspended, and force sync.
- Validation run:
  - `npm --prefix backend run build`: pass.
  - `npm --prefix backend test`: pass.
  - `npm --prefix frontend run lint`: pass.
  - `npm --prefix frontend run build`: pass with existing Vite chunk-size warning.
- Deferred: OWNER-only system-admin management endpoints are not part of the Phase 04 endpoint list and remain for a later admin-management phase.

### Phase 03 — Subscription service và backend gating

- Added `backend/src/services/subscriptionService.ts` with effective status calculation, normalized access state, inactive response shape, and `ACTIVE` 30-day default subscription creation.
- Added `backend/src/services/billingService.ts` foundation for manual payment recording and billing period calculation.
- Added app-state `subscription` metadata for active guilds while preserving `subscription: null` for no-guild states.
- Added subscription mutation checks to `requireGuildAccess`, attendance/GvG mutation routes, lineup mutations, guild import/sync, settings mutations, and member mutation services.
- Existing guild import updates are gated when the target guild subscription is inactive; new guild imports are allowed and receive a 30-day active subscription.
- Validation run:
  - `npm --prefix backend run build`: pass.
  - `npm --prefix backend test`: pass.
  - `npm --prefix frontend run lint`: pass.
  - `npm --prefix frontend run build`: pass with existing Vite chunk-size warning.

### Phase 02 — Auth multi-server

- Removed fixed-guild OAuth gating from `backend/src/services/authService.ts`; login now succeeds for any valid Discord OAuth user and chooses the first accessible imported guild or `null`.
- Bootstraps `SystemAdmin` rows with role `OWNER` from `SYSTEM_ADMIN_DISCORD_USER_IDS`.
- Auth status now returns multi-server bootstrap metadata: `isAuthenticated`, `activeGuildId`, `accessibleGuilds`, `systemAdminRole`, and `needsOnboarding`, while keeping legacy fields for compatibility.
- `/api/app/state` can return the existing safe null-guild app state for authenticated users without an active guild.
- Frontend auth types/bootstrap and top-level app UI now distinguish authenticated no-guild/lost-access/system-admin states.
- Validation run:
  - `npm --prefix backend run build`: pass.
  - `npm --prefix backend test`: pass.
  - `npm --prefix frontend run lint`: pass.
  - `npm --prefix frontend run build`: pass with existing Vite chunk-size warning.

### Phase 01 — Schema và migration

- Implemented Prisma enums/models for system admins, subscriptions, payment records and audit logs.
- Added guild onboarding/sync metadata fields.
- Added migration `20260526000000_add_saas_subscription_foundation` with inline backfill for existing guild subscriptions and onboarding completion.
- Added `SYSTEM_ADMIN_DISCORD_USER_IDS`, `SUBSCRIPTION_PRICE_VND`, and `SUBSCRIPTION_PLAN_CODE` to backend env example.
- Validation run:
  - `npm --prefix backend run prisma:generate`: pass.
  - backend local TypeScript binary `tsc -p backend/tsconfig.json --noEmit`: pass.
  - `npm --prefix backend test`: pass.
  - `npm --prefix backend run build`: pass.
  - reset dev DB public schema and `prisma migrate deploy`: pass.
  - `prisma migrate status`: database schema is up to date.
  - Prisma Client counts for Phase 01 models: pass; reset DB has no guild rows, so backfill count is `0` as expected.
- Note: migration was created manually because the first Prisma command was run from repo root and could not locate `backend/prisma/schema.prisma`.

## Implementation notes

When starting work:

1. Begin with `phase-01-schema-migration.md`.
2. Update this file after each meaningful step.
3. Mark a phase `Ready for validation` only when code is implemented and local checks are ready to run.
4. Mark a phase `Done` only after its listed validation passes.
5. Do not start frontend admin/onboarding screens before backend response contracts are stable.

## Validation command checklist

Backend from `backend/`:

```bash
npx tsc --noEmit
npm test
npm run build
```

Frontend from `frontend/`:

```bash
npm run lint
npm run build
```
