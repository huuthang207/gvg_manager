## Why

Phần tóm tắt vote điểm danh trên Discord đang chứa dòng thống kê theo phái, làm phần thông tin nhanh trở nên dài dù danh sách chi tiết vẫn đã hiển thị phái của người tham gia. Thêm biểu tượng cho tổng số vote giúp người xem nhận diện chỉ số này nhất quán với các trạng thái tham gia/không tham gia.

## What Changes

- Thêm biểu tượng `🗳️` trước nhãn tổng số vote trong phần tóm tắt điểm danh được hiển thị trên Discord.
- Bỏ dòng thống kê `Theo phái` khỏi phần tóm tắt Discord, bao gồm cả trạng thái chưa có vote.
- Giữ nguyên việc phân nhóm danh sách tham gia theo phái và việc hiển thị phái trong danh sách không tham gia.

## Capabilities

### New Capabilities
- `discord-attendance-summary`: Quy định nội dung phần tóm tắt vote của thông điệp điểm danh Discord.

### Modified Capabilities

- Không có.

## Impact

- `backend/src/services/attendanceRenderService.ts` sẽ thay đổi nội dung render công khai cho Discord.
- `backend/src/services/attendanceRenderService.test.ts` sẽ cập nhật các kiểm thử cho định dạng summary.
- Không thay đổi API, schema cơ sở dữ liệu, Discord interaction buttons, hoặc dữ liệu vote.
