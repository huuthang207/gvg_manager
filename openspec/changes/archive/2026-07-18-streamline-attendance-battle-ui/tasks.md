## 1. Attendance Workspace

- [x] 1.1 Refactor the AttendanceView primary layout from the persistent administration sidebar into a single-column operational workspace with a concise header and `Quản lý` entry point.
- [x] 1.2 Render the active-session card as the only location for session detail, refresh, and close actions; render a session-aware empty state with the open-session CTA when no session is active.
- [x] 1.3 Add a compact quick-action area that retains GvG participation finalization and prevents opening another attendance session while one is active.
- [x] 1.4 Simplify recent attendance history into read-only, detail-opening rows and remove inline selection/deletion controls from the workspace.

## 2. Secondary Management and History Cleanup

- [x] 2.1 Implement the attendance management modal/panel containing Discord channel configuration, access to GvG participation history, and month-level GvG deletion while preserving existing confirmation behavior.
- [x] 2.2 Keep single and bulk attendance-history deletion available only from the all-history management modal, preserving pagination, loading, error, and selection behavior.

## 3. Attendance History Review

- [x] 3.1 Refactor the attendance session detail summary into a compact header and response overview with GO, NOGO, not-responded, active-member, and progress information.
- [x] 3.2 Derive a unified active-member review row model that uses vote snapshots when present and represents no-vote members as `Chưa phản hồi`.
- [x] 3.3 Replace the parallel voted/not-voted panels with a single scrollable list or table that shows member, class, response status, and vote time.
- [x] 3.4 Replace the choice dropdown with status filter pills, retain search and class filtering, and add an empty-filter-result state.
- [x] 3.5 Make class composition a collapsible secondary section while preserving its existing class-count presentation.

## 4. Validation

- [x] 4.1 Run the frontend TypeScript/lint check and resolve any errors introduced by the attendance UI refactor.
- [x] 4.2 Exercise the attendance workspace states: active session, no active session, management actions, recent/all history, and GvG management controls.
- [x] 4.3 Exercise closed-session history review with each status filter, search/class filters, no-vote members, and expanded class composition.
