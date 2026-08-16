## 1. Data model and shared contracts

- [x] 1.1 Add `RESERVE` to the Prisma `AttendanceChoice` enum and create an additive PostgreSQL migration.
- [x] 1.2 Regenerate the Prisma client and extend backend/frontend attendance summary and choice types with a separate `reserve` count.
- [x] 1.3 Update attendance serializers and aggregate helpers so total votes include `GO`, `RESERVE`, and `NOGO`, while `reserve` remains separate from `go`.

## 2. Backend attendance and Discord flow

- [x] 2.1 Accept `RESERVE` in attendance API validation, vote persistence, and queued vote processing while retaining one latest vote per member and session.
- [x] 2.2 Extend Discord attendance custom ID parsing, interaction handling, and button components to support the `Dự bị` response for `GVG` and `SCRIM`.
- [x] 2.3 Render `Dự bị` count and member list separately in the Discord public attendance message without changing the GO-only GvG finalization or lineup eligibility rules.
- [x] 2.4 Update backend unit tests for serializers, attendance services/queue, Discord interaction parsing, and attendance rendering to cover `RESERVE` and response replacement.

## 3. Frontend attendance experience

- [x] 3.1 Extend frontend attendance types, choice metadata, badges, and active/history summary pills to present `Dự bị` independently in both GvG and Scrim views.
- [x] 3.2 Update attendance history details with a `Dự bị` metric, status filter, count, and member-row rendering while preserving correct response progress and `Chưa phản hồi` behavior.
- [x] 3.3 Confirm `GvgParticipationModal` continues to load only `GO` voters for its quick selection and no UI path treats `RESERVE` as confirmed participation.

## 4. Verification

- [x] 4.1 Run Prisma generation and backend type-check/build, then fix all `AttendanceChoice` exhaustiveness errors.
- [x] 4.2 Run backend test suite, including attendance renderer, Discord attendance, service, serializer, and queue tests.
- [x] 4.3 Run frontend TypeScript lint/build and verify GvG/Scrim summaries, filters, history, and GO-only GvG finalization behavior.