## Why

Điểm danh Bang Chiến và Scrim hiện chỉ cho phép thành viên trả lời `Tham gia` hoặc `Không tham gia`, nên không thể phân biệt những người chưa chắc chắn nhưng sẵn sàng thay thế khi cần. Trạng thái `Dự bị` giúp người quản lý có thông tin vận hành đầy đủ hơn mà không làm phình số lượng tham gia chính thức hoặc thay đổi quy tắc chọn roster hiện có.

## What Changes

- Bổ sung lựa chọn attendance `Dự bị` cho cả phiên `GVG` và `SCRIM`; mỗi thành viên vẫn chỉ có một phản hồi mới nhất.
- Cập nhật Discord attendance message với nút `Dự bị`, số lượng riêng và danh sách riêng, đồng thời giữ `Tham gia` và `Không tham gia`.
- Cập nhật API, persistence, realtime state và frontend để nhận, lưu, trả về, hiển thị và lọc trạng thái `Dự bị` trong phiên đang mở và lịch sử attendance.
- Hiển thị số `Dự bị` riêng trong summary workspace, lịch sử và màn chi tiết; số này không được cộng vào `Tham gia`.
- Giữ nguyên luồng chốt tham gia thực tế Bang Chiến: action chọn nhanh chỉ dùng người vote `GO`; người `Dự bị` không tự động được nạp vào danh sách chốt.
- Giữ nguyên rule lineup roster source: chỉ vote `GO` đủ điều kiện cho assignment mới.

## Capabilities

### New Capabilities

- Không có.

### Modified Capabilities

- `attendance-workspace`: Hiển thị và tổng hợp trạng thái `Dự bị` trên workspace attendance GvG và Scrim.
- `attendance-history-review`: Review lịch sử hỗ trợ hiển thị, đếm và lọc phản hồi `Dự bị`.
- `scrim-attendance`: Phiên Scrim hỗ trợ lựa chọn `Dự bị` cùng với `GO` và `NOGO`.
- `discord-attendance-summary`: Discord attendance message hiển thị nút, tổng hợp và danh sách `Dự bị`.

## Impact

- **Backend/Prisma:** Mở rộng enum `AttendanceChoice`, migration PostgreSQL, validation route, Discord button parsing/handling, attendance serializers, render service, hàng đợi vote và các test liên quan.
- **Frontend:** Mở rộng attendance types và `AttendanceView` để render badge, summary, filter, lịch sử và chi tiết cho `Dự bị`.
- **Discord:** Message attendance cho cả `GVG` và `SCRIM` có ba nút lựa chọn; người dùng có thể bấm trạng thái mới để thay thế vote trước đó.
- **Tích hợp hiện có:** `GvgParticipationModal` và GvG lineup vẫn chỉ dùng vote `GO` làm nguồn chọn nhanh/đủ điều kiện.