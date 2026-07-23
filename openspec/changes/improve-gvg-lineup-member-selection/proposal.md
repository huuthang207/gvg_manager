## Why

Việc chọn thành viên trong đội hình Bang Chiến hiện chưa hỗ trợ lọc nhanh theo phái và chỉ loại người đã có trong cùng một tổ đội. Người đã được xếp ở tổ đội khác vẫn xuất hiện trong danh sách chọn, khiến bang chủ dễ chọn nhầm và chỉ phát hiện khi server từ chối lúc lưu.

## What Changes

- Thêm bộ lọc phái tạm thời tại bên trái mỗi vị trí thành viên trong tổ đội; bộ lọc không được lưu vào API hoặc database.
- Giới hạn danh sách thành viên của mỗi vị trí theo phái đang lọc và chỉ hiển thị thành viên active chưa được gán ở bất kỳ vị trí nào khác của đội hình.
- Giữ thành viên hiện tại của chính vị trí đó trong danh sách để có thể xem hoặc giữ lựa chọn hiện có.
- Đồng bộ hiển thị phái theo thành viên khi một thành viên được chọn; khi gỡ thành viên, vị trí trở lại trạng thái lọc mặc định.
- Thu gọn nút gỡ thành viên thành nút icon dấu trừ, vẫn giữ nhãn truy cập và tooltip phù hợp.

## Capabilities

### New Capabilities

- Không có.

### Modified Capabilities

- `fixed-gvg-squad-layout`: Cập nhật trải nghiệm chọn và gỡ thành viên trong vị trí của tổ đội, bao gồm lọc phái tạm thời và loại trừ thành viên đã được xếp trên toàn bộ đội hình.

## Impact

- Affected frontend: `frontend/src/features/gvg-lineup/GvgLineupWorkspace.tsx` và các helper layout liên quan.
- Affected behavior: dropdown chọn thành viên của workspace Bang Chiến.
- Không thay đổi backend API, Prisma schema, database migration, hay payload lưu đội hình; server tiếp tục xác thực thành viên active và không trùng lặp như lớp bảo vệ cuối cùng.
