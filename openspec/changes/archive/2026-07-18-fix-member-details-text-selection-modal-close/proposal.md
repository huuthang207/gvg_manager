## Why

Khi người dùng kéo chuột để bôi đen tên trong ô nhập của modal Chi tiết thành viên rồi thả chuột ra ngoài vùng hội thoại, thao tác này có thể bị xem là click vào backdrop và đóng modal. Việc mất trạng thái chỉnh sửa như vậy làm gián đoạn thao tác nhập liệu và có thể khiến người dùng mất thay đổi chưa lưu.

## What Changes

- Điều chỉnh hành vi đóng modal Chi tiết thành viên để một thao tác chọn văn bản bắt đầu trong nội dung modal không thể vô tình đóng modal khi kết thúc trên backdrop.
- Giữ nguyên khả năng đóng modal bằng thao tác click/tap chủ ý trên backdrop, nút đóng, và sau khi lưu thay đổi thành công.
- Bảo toàn dữ liệu đang chỉnh sửa trong modal nếu thao tác chọn văn bản không phải là yêu cầu đóng modal.

## Capabilities

### New Capabilities

- Không có.

### Modified Capabilities

- `member-management`: Modal chi tiết thành viên phải phân biệt thao tác đóng backdrop chủ ý với thao tác chọn văn bản trong trường chỉnh sửa.

## Impact

- Frontend modal chi tiết thành viên trong `frontend/src/features/members/MemberDashboard.tsx`.
- Không thay đổi API, dữ liệu backend, hoặc dependency.
