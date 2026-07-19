## 1. Data Model and Migration

- [x] 1.1 Add an `AttendanceType` enum with `GVG` and `SCRIM`, add type fields to attendance sessions and channel configurations, and update Prisma relations/indexes for per-type configuration and open-session queries.
- [x] 1.2 Create and apply a Prisma migration that backfills existing attendance sessions/configuration as `GVG`, replaces the channel uniqueness constraint with `(guildId, type)`, and generates the Prisma client. (User confirmed the migration completed successfully; the generated client includes `AttendanceType`.)

## 2. Typed Attendance Backend

- [x] 2.1 Refactor attendance service methods, queries, serializers, and app-state construction to accept/filter attendance type while retaining GVG defaults for existing consumers.
- [x] 2.2 Update attendance HTTP routes and request validation to operate on selected types, including typed configuration, open/close/refresh, history, detail, delete, and web vote flows.
- [x] 2.3 Make Discord rendering, message refresh queues, and button IDs type-aware; retain legacy GVG button-ID parsing compatibility and validate type/session ownership before persisting votes.
- [x] 2.4 Add `/diemdanhscrim` Discord command with open, close, and refresh subcommands; retain `/diemdanhbangchien` as GVG and use Scrim-specific Discord labels/responses.
- [x] 2.5 Add backend tests covering independent channel configuration, concurrent GVG/Scrim sessions, type-filtered history, typed vote isolation, and legacy GVG compatibility.

## 3. Frontend Scrim Workspace

- [x] 3.1 Update shared frontend types, app-state handling, and attendance API clients for typed attendance state and operations.
- [x] 3.2 Add GVG/Scrim selector to the attendance workspace and bind the selected type to active session, open modal, refresh/close actions, history, and management channel configuration.
- [x] 3.3 Keep GvG-only participation finalization/history/monthly cleanup scoped to the GVG tab and render Scrim as the independent attendance MVP without roster controls.
- [x] 3.4 Update attendance copy, titles, empty states, and history/details labels so Scrim is clearly identified without changing the shared GO/NOGO review experience.

## 4. Validation

- [x] 4.1 Run Prisma generation/migration validation, backend type-check/tests, and frontend lint/type-check; resolve issues introduced by typed attendance support. (Prisma client generation, backend build, 45 backend tests, and frontend type-check passed.)
- [x] 4.2 Exercise GVG and Scrim sessions concurrently through HTTP/Discord-facing flows, verifying channel isolation, vote isolation, close/refresh behavior, and history filtering. (User manually verified the flows.)
- [x] 4.3 Drive the frontend GVG/Scrim selector, configuration dialogs, empty/active states, and Scrim history/detail review in a running browser. (User manually verified the UI.)
