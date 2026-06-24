## Why

Người dùng phản ánh khi bấm nút điểm danh Bang Chiến trên Discord thì trạng thái **"GvG Manager đang suy nghĩ..."** xuất hiện quá lâu trước khi nhận được phản hồi. Vấn đề này cần được xử lý ngay vì nó làm trải nghiệm vote thiếu tin cậy, khó phân biệt giữa vote thành công, vote chậm, hay interaction đã hết hạn.

## What Changes

- Điều chỉnh Discord attendance button interaction để acknowledge nhanh hơn và giảm thời gian spinner/thinking khi người dùng bấm `Tham gia` hoặc `Không tham gia`.
- Giữ vote persistence là source of truth, đồng thời tiếp tục tách public attendance message refresh sang background path đã có coalescing.
- Tăng khả năng truy vết bằng timing/log metadata rõ hơn cho interaction acknowledge, vote persistence, refresh queue, và refresh execution.
- Bổ sung hoặc cập nhật test cho attendance button flow để bao quát `Unknown interaction` (`10062`), success/error feedback, và thứ tự queue refresh sau khi vote được ghi nhận.

## Capabilities

### New Capabilities
- _Không có._

### Modified Capabilities
- `attendance-vote-reliability`: tinh chỉnh requirement của Discord attendance vote path để button interaction được acknowledge sớm hơn, feedback không giữ spinner quá lâu, và debug logs đủ chi tiết để chẩn đoán interaction latency.

## Impact

- Affected code:
  - `backend/src/botAttendance.ts`
  - `backend/src/botAttendance.test.ts`
  - `backend/src/services/attendanceDiscordService.ts`
  - `backend/src/services/attendanceDiscordService.test.ts`
- Affected systems:
  - Discord bot interaction handling
  - Attendance vote persistence and background public message refresh
  - Debug/observability cho attendance vote reliability
- Không dự kiến thay đổi public HTTP API hoặc database schema.