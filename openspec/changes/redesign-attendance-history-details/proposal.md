## Why

Phần **Chi tiết lịch sử điểm danh** hiện hiển thị đầy đủ dữ liệu nhưng chưa có thứ bậc thông tin rõ ràng: summary, cơ cấu phái, bộ lọc, danh sách vote và danh sách chưa điểm danh đang cạnh tranh sự chú ý với nhau. Điều này làm người quản lý bang khó nắm nhanh tình hình của một phiên điểm danh đã đóng, đặc biệt khi cần xem ai đã phản hồi, ai chưa phản hồi, và cơ cấu người tham gia ra sao.

## What Changes

- Thiết kế lại modal **Chi tiết lịch sử điểm danh** để ưu tiên thông tin tổng quan trước, sau đó mới đi vào danh sách chi tiết.
- Thêm khu vực summary trực quan hơn cho số lượng `GO`, `NOGO`, `chưa điểm danh`, tổng số thành viên active và tiến độ phản hồi.
- Tổ chức lại phần nội dung chi tiết theo cấu trúc gọn gàng hơn, bao gồm toolbar lọc/tìm kiếm và khu vực danh sách dễ quét mắt hơn.
- Đổi cách trình bày danh sách vote và danh sách chưa điểm danh để giảm cảm giác nặng bảng, rõ trạng thái hơn trên desktop và mobile.
- Điều chỉnh hierarchy, spacing, mật độ border/background và nhấn mạnh visual state để modal dễ nhìn, gọn và nhất quán hơn với phần còn lại của attendance UI.

## Capabilities

### New Capabilities
- `attendance-history-details`: Quy định cách modal chi tiết lịch sử điểm danh phải trình bày summary, bộ lọc và danh sách trạng thái để hỗ trợ review nhanh một phiên đã đóng.

### Modified Capabilities
- `attendance-lineup-simplification`: Bổ sung requirement cho cách attendance history đã đóng được trình bày sau khi flow attendance chỉ còn `GO` và `NOGO`.

## Impact

- Affected frontend code: `frontend/src/features/attendance/AttendanceView.tsx`
- Có thể cần tách thêm UI subcomponents trong `frontend/src/features/attendance/`
- Không yêu cầu thay đổi backend API, database schema hoặc Discord bot flow
- Tác động chủ yếu đến attendance history modal, filtering UX, layout responsiveness và visual consistency của attendance screen
