## Why

Màn Điểm danh Bang Chiến hiện phân tán các thao tác hằng ngày, cấu hình hiếm dùng và thao tác xóa trong sidebar cố định; đồng thời hành động làm mới/đóng phiên bị lặp lại. Modal chi tiết lịch sử cũng hiển thị nhiều khối và hai danh sách song song, làm việc review một phiên đã đóng trở nên dài và khó quét.

## What Changes

- Tối giản workspace điểm danh thành màn vận hành tập trung vào phiên hiện tại, các hành động chính và lịch sử gần đây; loại bỏ sidebar quản trị cố định.
- Hiển thị một empty state có CTA mở phiên khi không có attendance session đang mở; khi có phiên, chỉ giữ các hành động chi tiết, làm mới và đóng phiên tại thẻ phiên hiện tại.
- Đưa cấu hình kênh Discord, lịch sử chốt bang chiến đầy đủ và xóa dữ liệu bang chiến theo tháng vào khu vực Quản lý phụ để các thao tác hiếm dùng hoặc phá hủy không cạnh tranh với tác vụ hằng ngày.
- Đơn giản hóa lịch sử gần đây thành các hàng chỉ đọc có thể mở chi tiết; cô lập chọn/xóa hàng loạt vào chế độ quản lý lịch sử.
- Thiết kế lại modal chi tiết lịch sử attendance thành luồng review cô đọng: summary phản hồi, filter trạng thái/tìm kiếm/phái, một danh sách thành viên hợp nhất và cơ cấu phái theo yêu cầu.
- Giữ nguyên API, dữ liệu attendance, các quyền hiện có, Discord flow và behavior chốt tham gia bang chiến.

## Capabilities

### New Capabilities
- `attendance-workspace`: Quy định màn workspace điểm danh tối giản, phân cấp thao tác vận hành hằng ngày và khu vực quản lý phụ.
- `attendance-history-review`: Quy định modal review lịch sử điểm danh cô đọng với summary, filtering và danh sách thành viên hợp nhất.

### Modified Capabilities
- `attendance-lineup-simplification`: Bổ sung cách attendance history đang/đã đóng được trình bày và quản lý sau khi flow chỉ còn `GO` và `NOGO`.

## Impact

- Affected frontend code: `frontend/src/features/attendance/AttendanceView.tsx` và có thể có presentational subcomponents trong `frontend/src/features/attendance/`.
- Affected UX: màn điểm danh, modal quản lý, modal lịch sử, modal chi tiết attendance; modal chốt tham gia bang chiến giữ nguyên ở scope này.
- Không thay đổi backend API, Prisma schema, Discord bot, dependencies hoặc quyền truy cập.
