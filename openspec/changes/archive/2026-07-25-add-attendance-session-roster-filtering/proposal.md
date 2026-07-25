## Why

Khi quản trị viên xếp đội hình Bang Chiến hoặc Scrim, member picker hiện cho phép chọn mọi thành viên active, kể cả người không đăng ký tham gia buổi đó. Điều này làm roster không khớp với điểm danh và buộc người xếp đội phải đối chiếu thủ công.

## What Changes

- Bổ sung lựa chọn nguồn roster trong workspace xếp đội hình: tất cả thành viên active hoặc một phiên attendance GvG/Scrim cụ thể.
- Khi một phiên attendance được chọn, chỉ thành viên có vote `GO` trong phiên đó được phép được gán mới vào slot đội hình.
- Hiển thị số lượng thành viên đủ điều kiện và cập nhật candidate picker theo phiên đã chọn; giữ nguyên workflow hiện tại khi chọn nguồn tất cả thành viên.
- Bảo toàn assignment hiện hữu nếu vote thay đổi sau khi đã xếp, nhưng cảnh báo những người không còn đủ điều kiện và không cho dùng họ cho assignment mới.
- Mở rộng API cập nhật squad slot để nhận nguồn attendance tùy chọn và xác thực eligibility ở backend, ngăn bypass rule qua request trực tiếp.

## Capabilities

### New Capabilities
- `attendance-backed-lineup-roster`: Liên kết nguồn roster lineup với attendance session GvG/Scrim và giới hạn assignment mới theo vote `GO`.

### Modified Capabilities
- `fixed-gvg-squad-layout`: Thay đổi member candidate và cập nhật slot để nhận biết nguồn roster attendance tùy chọn.

## Impact

- **Frontend:** `App.tsx`, state/type/API lineup, `GvgLineupWorkspace`, layout helper và test candidate filtering.
- **Backend:** validation request cập nhật GvG lineup, `gvgLineupService`, route/API contract và test service/route.
- **Data:** dùng `AttendanceSession`/`AttendanceVote` hiện có; có thể cần lưu attendance session source trên lineup để giữ ngữ cảnh khi reload và enforce mutation nhất quán.
- **Realtime:** tận dụng app-state refresh hiện có cho `attendance_updated` để cập nhật roster eligibility.
