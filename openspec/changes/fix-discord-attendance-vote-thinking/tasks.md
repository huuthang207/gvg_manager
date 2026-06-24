## 1. Add durable attendance vote queue

- [x] 1.1 Add `AttendanceVoteJobStatus` and `AttendanceVoteJob` to `backend/prisma/schema.prisma` with mutable work-row semantics keyed by `(sessionId, discordUserId)`.
- [x] 1.2 Add a Prisma migration for attendance vote jobs and regenerate the Prisma client.
- [x] 1.3 Create `backend/src/services/attendanceVoteQueueService.ts` to enqueue, claim, process, and retry attendance vote jobs.

## 2. Move Discord button vote flow to ack + enqueue

- [x] 2.1 Refactor `backend/src/botAttendance.ts` so button interactions acknowledge quickly and enqueue a vote job instead of persisting the vote inline.
- [x] 2.2 Update Discord feedback wording to confirm the request was received and is being processed asynchronously.
- [x] 2.3 Start the attendance vote worker from `backend/src/server.ts` while keeping `queueAttendanceDiscordMessageRefresh(...)` as the second-stage in-memory refresh coalescer.

## 3. Verify worker behavior and regression coverage

- [x] 3.1 Add tests for queue enqueue/claim/process/retry behavior in `backend/src/services/attendanceVoteQueueService.test.ts`.
- [x] 3.2 Update `backend/src/botAttendance.test.ts` to cover enqueue success, enqueue failure, and acknowledge failure under the new async model.
- [x] 3.3 Run backend attendance/refresh tests and backend type-check, then fix any regressions.