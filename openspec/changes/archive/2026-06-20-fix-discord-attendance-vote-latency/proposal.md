## Why

Luồng vote attendance trên Discord hiện phản hồi không ổn định: có người nhận xác nhận gần như ngay lập tức, có người bị treo lâu ở trạng thái `GvG Manager đang suy nghĩ...`, đặc biệt khi nhiều người vote gần nhau. Vấn đề này đang ảnh hưởng trực tiếp đến trải nghiệm điểm danh trong thời điểm cao tải và cần được xử lý trước khi mở rộng thêm behavior attendance khác.

## What Changes

- Rút gọn hot path của Discord attendance button để bot xác nhận vote nhanh hơn, không phụ thuộc vào việc hydrate full attendance session trong cùng interaction.
- Thêm cơ chế queue/coalesce refresh Discord attendance message theo từng session để tránh refresh storm khi nhiều vote đến liên tiếp.
- Giảm write/read amplification quanh `AttendanceSession` metadata và giảm các refresh app-state dư thừa do `attendance_updated` bursts.
- Bổ sung observability, timing logs, và test coverage cho button interaction, refresh coordination, và realtime attendance refresh.

## Capabilities

### New Capabilities
- `attendance-vote-reliability`: Định nghĩa behavior phản hồi vote Discord nhanh, refresh Discord message theo kiểu coalesced, và cập nhật realtime attendance ổn định dưới burst traffic.

### Modified Capabilities
<!-- None. -->

## Impact

- Affected backend code: `backend/src/botAttendance.ts`, `backend/src/services/attendanceService.ts`, `backend/src/services/attendanceDiscordService.ts`, `backend/src/routes/attendanceRoutes.ts`, `backend/src/services/realtimeGateway.ts`
- Affected frontend code: `frontend/src/features/app/useGuildRealtime.ts`
- Affected test coverage: attendance service tests, Discord refresh coordination tests, bot interaction tests, realtime hook tests
- Systems impacted: Discord bot interaction flow, attendance rendering pipeline, WebSocket-triggered app-state refresh behavior
