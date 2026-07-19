## 1. Prepare authorization and contracts

- [x] 1.1 Inventory all `manage:lineup`, `manage:snapshots`, and `restore:snapshots` consumers; introduce or map attendance administration to a non-lineup permission and update authorization tests.
- [x] 1.2 Remove lineup/snapshot/skill fields from shared backend/frontend app-state contracts, API types, serializers, loaders, and request/response consumers.
- [x] 1.3 Update active-tab types and localStorage normalization so persisted `teams` or other invalid values resolve to a supported fallback tab.

## 2. Remove frontend lineup and skill experience

- [x] 2.1 Remove the `teams` navigation tab, lineup header controls, lazy mount/state wiring, and lineup-only realtime refresh/lock handling from the app shell.
- [x] 2.2 Delete the `frontend/src/features/lineup` subtree and lineup-only helpers, hooks, tests, API client, types, and re-exports.
- [x] 2.3 Remove member skill actions, UI state, API calls, and frontend references to `assignedSkills` or app-state `skills`.
- [x] 2.4 Confirm attendance UI/history and GvG participation retain their existing GO/NOGO flows without an attendance-to-lineup entrypoint.

## 3. Remove backend lineup, snapshots, skills, and realtime

- [x] 3.1 Unregister lineup routes and delete lineup route handlers, persistence/snapshot service, edit-lock service, serializers, and lineup-only backend tests.
- [x] 3.2 Remove legacy division (`Team`/`TeamSlot`) app-state includes/serialization and dynamic squad/snapshot/lock app-state fields.
- [x] 3.3 Remove lineup/snapshot realtime reason types, publishers, and frontend consumers while preserving websocket support for attendance/member/guild updates.
- [x] 3.4 Delete member skill endpoints and service operations; remove skill cleanup/serialization references without affecting member lifecycle operations.
- [x] 3.5 Update guild reset and any remaining backend workflows to stop querying or deleting removed lineup/skill models.

## 4. Remove database domain

- [x] 4.1 Remove lineup and skill models/relations from the Prisma schema: legacy `Team`/`TeamSlot`, dynamic squad models, snapshot hierarchy, `Skill`, and `MemberSkill`.
- [x] 4.2 Create and review a forward Prisma migration that drops dependent tables in foreign-key-safe order and does not alter historical migrations.
- [x] 4.3 Regenerate the Prisma client and fix all generated-client/type errors caused by the schema removal.

## 5. Verify behavior and deployment readiness

- [x] 5.1 Add or update backend tests for attendance authorization without lineup permissions, app-state without lineup/skill fields, guild reset, and member lifecycle behavior.
- [x] 5.2 Run backend tests and TypeScript checks, plus the frontend TypeScript check and production build; resolve failures.
- [x] 5.3 Exercise the deployed/local runtime: login, guild switching, persisted legacy `teams` tab fallback, member management, attendance config/open/vote/refresh/close/history, GvG attendance selection, guild reset, and websocket updates.
- [x] 5.4 Document destructive migration pre-deploy backup/record-count validation and post-deploy smoke-test/restore procedure for the release.
