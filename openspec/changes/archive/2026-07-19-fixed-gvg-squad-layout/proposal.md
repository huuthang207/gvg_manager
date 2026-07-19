## Why

Bang Chiến cần cấu trúc đội hình chiến thuật có thể dự đoán thay vì trình chỉnh sửa đội hình tự do trước đây. Bang chủ phải có thể phân bổ mười tổ đội đánh số cố định vào các đoàn, xem thành viên đã gán, và sắp xếp nhanh cấu trúc mà không làm thay đổi danh tính tổ đội.

## What Changes

- Cung cấp workspace Bang Chiến với đúng mười tổ đội cố định, được đánh số toàn cục từ `Tổ đội 1` đến `Tổ đội 10`.
- Tổ chức các tổ đội vào hai đến năm đoàn không rỗng, được hiển thị lần lượt là `Đoàn 1` đến `Đoàn 5`; đoàn không có tên tùy chỉnh và sẽ bị loại bỏ khi trống.
- Giới hạn mỗi đoàn tối đa năm tổ đội và mỗi tổ đội tối đa sáu thành viên bang còn hoạt động.
- Cho phép bang chủ kéo thả để sắp xếp/chuyển tổ đội, thêm hoặc loại bỏ đoàn trong giới hạn hợp lệ, đồng thời gán, gỡ và xóa toàn bộ thành viên của một tổ đội.
- Thay thế hành vi tạo/đặt tên tổ đội và đoàn tự do bằng danh tính tổ đội cố định cùng lưu layout được kiểm tra hợp lệ và lưu nguyên tử.
- Cho phép người có `view:guild` đọc đội hình; chỉ bang chủ được lưu layout hoặc xóa tổ đội. Luồng edit lock cũ không thuộc active contract.
- Phát realtime event `gvg_lineup_updated` sau mutation thành công để client tải lại layout hiện tại.

## Capabilities

### New Capabilities
- `fixed-gvg-squad-layout`: Manage a fixed ten-squad Bang Chiến lineup, its division allocation, and member assignments.

### Modified Capabilities
- None.

## Impact

- Backend Prisma schema/migration cho quan hệ đoàn, số tổ đội cố định và sáu member slots.
- Lineup service, route API owner-only, app-state payload, validation và realtime updates.
- Frontend workspace, types/API client và UI kéo thả constrained layout.
- Dữ liệu lineup flexible/lock/snapshot cũ được loại khỏi active contract; layout cố định sẽ khởi tạo mới theo quyết định sản phẩm.
