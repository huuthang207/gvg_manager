## Why

Khái niệm `dự bị / standby / MAYBE` hiện đang xuyên suốt từ điểm danh Discord đến import đội hình, drag/drop, snapshot, và các màn hình thống kê. Điều này làm mô hình attendance và lineup phức tạp hơn nhu cầu sử dụng thực tế, đồng thời tạo thêm nhiều nhánh logic cần bảo trì.

Cần loại bỏ khái niệm này để attendance chỉ còn trạng thái tham gia / không tham gia, và lineup chỉ còn một lane thành viên chính. Việc này sẽ đơn giản hóa UI, dữ liệu lưu trữ, và luồng import/restore của hệ thống.

## What Changes

- Xóa hoàn toàn khái niệm `dự bị / standby / MAYBE` khỏi attendance và lineup domain.
- Xóa `reserveMemberIds` khỏi model đội hình, snapshot, serializer, và các API/payload liên quan.
- Xóa các reserve slots và toàn bộ UI reserve trong màn hình xếp đội hình, saved lineup, và các màn hình liên quan.
- Xóa lựa chọn `MAYBE` khỏi attendance flow, Discord attendance buttons, và summary/render của attendance session.
- Xóa luồng import thành viên dự bị và checkbox thêm người chưa điểm danh vào dự bị khỏi attendance import modal.
- **BREAKING**: Payload attendance mới không còn trạng thái `MAYBE`; payload lineup và snapshot mới không còn `reserveMemberIds`.
- Giữ khả năng hệ thống đọc dữ liệu cũ có `reserveMemberIds` hoặc vote `MAYBE` mà không làm hỏng các luồng restore/render hiện có.

## Capabilities

### New Capabilities
- `attendance-lineup-simplification`: Đơn giản hóa attendance và lineup để chỉ còn hai trạng thái attendance (`GO`, `NOGO`) và một lane thành viên trong đội hình.

### Modified Capabilities
- `lineup-management`: Điều chỉnh yêu cầu lineup để đội hình không còn reserve slots, reserve counts, hoặc reserve member persistence.
- `member-management`: Điều chỉnh behavior member card trong lineup flow để hoạt động trong mô hình không có reserve lane.

## Impact

- Frontend lineup UI: `TeamCard.tsx`, `MemberSlot.tsx`, `TeamLayout.tsx`, `SavedLineupsView.tsx`, `SquadSetupScreen.tsx`, `attendanceLineupImport.ts`, `MainBoard.tsx`.
- Shared lineup types và attendance import contract ở frontend.
- Backend attendance flow: Discord buttons, vote parsing, attendance render/summary, attendance service validation.
- Backend lineup persistence: serializer, snapshot save/restore, lineup route payload typing.
- Legacy attendance sessions và legacy snapshots cần được xử lý tương thích khi đọc dữ liệu cũ.
