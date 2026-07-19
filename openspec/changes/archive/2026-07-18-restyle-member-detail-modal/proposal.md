## Why

Modal Chi tiết thành viên hiện sử dụng header gradient, button và cấu trúc card khác với các modal quản trị mới của ứng dụng. Việc chuẩn hóa modal này giúp luồng quản lý thành viên có giao diện nhất quán, rõ ràng hơn về các thao tác chỉnh sửa và giảm rủi ro khi gỡ role Bang Viên.

## What Changes

- Thiết kế lại modal Chi tiết thành viên theo pattern modal quản trị hiện tại: header gọn gồm icon, tiêu đề, mô tả và nút đóng; bề mặt slate, border và spacing thống nhất.
- Tổ chức lại nội dung thành các khu vực hồ sơ, thông tin Discord, quản lý phái và khu vực nguy hiểm.
- Chuẩn hóa các trạng thái button, focus và semantics dialog theo các primitive giao diện dùng chung.
- Giữ nguyên toàn bộ quyền hạn và behavior hiện có: chỉ người quản lý thành viên mở modal; cập nhật tên ingame, đổi phái, đồng bộ Discord role, gỡ role và đóng backdrop vẫn hoạt động như hiện tại.

## Capabilities

### New Capabilities

- `member-detail-modal-consistency`: Quy định giao diện và khả năng truy cập nhất quán cho modal Chi tiết thành viên.

### Modified Capabilities

- `member-management`: Bổ sung yêu cầu về bố cục và presentation chuẩn hóa của modal chi tiết thành viên, đồng thời bảo toàn các interaction hiện có.

## Impact

- Affected frontend: `frontend/src/features/members/MemberDashboard.tsx`.
- Có thể tái sử dụng các utility class hiện có trong `frontend/src/index.css` (`app-button-primary`, `app-button-secondary`, `app-button-danger`).
- Không thay đổi API backend, Prisma schema, payload dữ liệu, phân quyền hoặc dependency.
