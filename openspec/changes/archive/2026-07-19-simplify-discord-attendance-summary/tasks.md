## 1. Update Discord attendance rendering

- [x] 1.1 Update `renderSummary` to prefix the total-vote line with `🗳️` and remove the summary class-aggregation line.
- [x] 1.2 Preserve the existing class grouping for participant lists and per-person class display for non-participants.

## 2. Verify summary behavior

- [x] 2.1 Update attendance renderer unit tests to expect the `🗳️ Tổng vote` line and to reject `Theo phái` output for sessions with votes.
- [x] 2.2 Cover the no-vote summary case to ensure it retains zero counts and omits the former class empty state.
- [x] 2.3 Run the focused attendance renderer test file and the backend TypeScript check.
