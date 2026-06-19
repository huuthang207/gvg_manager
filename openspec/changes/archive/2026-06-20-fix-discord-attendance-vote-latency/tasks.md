## 1. Backend vote hot path optimization

- [x] 1.1 Tách shared validation/mutation helpers trong `backend/src/services/attendanceService.ts` để bot vote path có thể persist vote mà không hydrate full attendance session.
- [x] 1.2 Cập nhật `backend/src/botAttendance.ts` dùng lightweight vote helper và giữ ephemeral confirmation độc lập với public message refresh.
- [x] 1.3 Giữ web/admin attendance flows tương thích với service behavior hiện tại hoặc điều chỉnh tối thiểu để không làm đổi semantics API.

## 2. Discord refresh coordination

- [x] 2.1 Thêm per-session refresh coordinator trong `backend/src/services/attendanceDiscordService.ts` theo pattern dedupe/serialization tương tự `backend/src/services/syncService.ts`.
- [x] 2.2 Chuyển Discord button vote và web vote route sang enqueue/coalesced refresh thay vì gọi trực tiếp `editAttendanceDiscordMessage(...)` cho mỗi vote.
- [x] 2.3 Giảm write amplification quanh `lastRenderedAt` để refresh metadata không tạo contention không cần thiết trên `AttendanceSession`.

## 3. Realtime and observability

- [x] 3.1 Coalesce `attendance_updated` handling trong `frontend/src/features/app/useGuildRealtime.ts` để tránh multiple in-flight app-state refreshes cho attendance bursts.
- [x] 3.2 Thêm debug/timing logs có gating cho interaction path, attendance vote service, refresh queue, và realtime attendance refresh coordination.
- [x] 3.3 Rà lại các điểm publish `attendance_updated` trong `backend/src/services/attendanceService.ts` và loại bỏ publish dư thừa chỉ phục vụ bookkeeping nội bộ.

## 4. Tests and verification

- [x] 4.1 Mở rộng `backend/src/services/attendanceService.test.ts` để cover lightweight vote persistence và giữ nguyên business error cases.
- [x] 4.2 Thêm test cho `backend/src/services/attendanceDiscordService.ts` để verify coalesced refresh behavior, pending rerun, và failure recovery.
- [x] 4.3 Thêm test cho `backend/src/botAttendance.ts` và `frontend/src/features/app/useGuildRealtime.ts`, rồi chạy backend tests, backend type-check, và frontend lint/type-check để xác nhận toàn bộ thay đổi.
