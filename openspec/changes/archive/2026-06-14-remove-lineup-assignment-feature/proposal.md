## Why

Tính năng sắp xếp đội hình hiện đang bao gồm thêm lớp hiển thị “Phân công của bạn”, “Danh sách phân công”, và ghi chú phân công theo từng thành viên. Phần này làm giao diện và mô hình dữ liệu của lineup phức tạp hơn nhu cầu sử dụng hiện tại, trong khi giá trị vận hành không còn cần thiết.

Cần loại bỏ tính năng này lúc này để đơn giản hóa trải nghiệm sắp xếp đội hình, giảm dữ liệu phát sinh trong snapshot, và thu gọn phạm vi bảo trì giữa frontend và backend.

## What Changes

- Xóa khu vực hiển thị “Phân công của bạn” khỏi màn hình lineup.
- Xóa khu vực “Danh sách phân công”, bao gồm bộ đếm, tìm kiếm, bảng liệt kê, và chỉnh sửa ghi chú theo thành viên.
- Xóa dữ liệu `memberNotes` khỏi mô hình lineup ở frontend, backend, serializer, và snapshot persistence.
- Xóa các callback, props, state, và luồng API nội bộ chỉ phục vụ assignment display / member note editing.
- **BREAKING**: Snapshot và payload lineup mới sẽ không còn ghi ra trường `memberNotes`.
- Giữ khả năng hệ thống xử lý dữ liệu snapshot cũ có chứa `memberNotes` mà không làm hỏng quá trình đọc dữ liệu.

## Capabilities

### New Capabilities
- `lineup-management`: Quản lý và lưu trữ đội hình không bao gồm assignment summary hoặc member note metadata.

### Modified Capabilities
- `member-management`: Điều chỉnh yêu cầu tích hợp với lineup để dữ liệu thành viên không còn hỗ trợ luồng ghi chú phân công trong màn hình sắp xếp đội hình.

## Impact

- Frontend lineup UI, chủ yếu tại `frontend/src/features/lineup/MainBoard.tsx`, `TeamCard.tsx`, và `MemberSlot.tsx`.
- Shared lineup types tại frontend và API contract liên quan đến snapshot / squad serialization.
- Backend lineup persistence, đặc biệt serializer, route/service cập nhật lineup, và snapshot storage/restore.
- Dữ liệu snapshot cũ cần được kiểm tra tương thích khi đọc sau thay đổi.
