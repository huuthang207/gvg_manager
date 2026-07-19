## Why

Tính năng Sắp Xếp Đội Hình không còn nằm trong phạm vi sản phẩm nhưng hiện vẫn duy trì một tab UI, API, WebSocket events, quyền, trạng thái ứng dụng, dữ liệu layout/snapshot cũ và mới, cùng dữ liệu kỹ năng chỉ phục vụ lineup. Việc loại bỏ toàn bộ domain này sẽ giảm bề mặt bảo trì và tránh tiếp tục lưu dữ liệu không còn được người dùng sử dụng.

## What Changes

- Xóa tab và toàn bộ trải nghiệm Sắp Xếp Đội Hình, gồm drag-and-drop, nhóm/đội, locks, snapshots, export ảnh và import attendance vào lineup.
- **BREAKING**: Xóa API layout, edit lock, saved lineup snapshot, và các fields lineup khỏi app-state và frontend contracts.
- **BREAKING**: Xóa toàn bộ dữ liệu lineup qua forward database migration: legacy `Team`/`TeamSlot`, dynamic `SquadGroup`/`SquadTeam`/`SquadTeamSlot`, và `LineupSnapshot` hierarchy.
- **BREAKING**: Xóa `Skill`/`MemberSkill` cùng API và app-state fields kỹ năng vì chúng chỉ phục vụ lineup.
- Xóa realtime events, permissions và route/service/serializer chỉ phục vụ lineup hoặc snapshot.
- Tách các thao tác quản trị attendance khỏi permission `manage:lineup` trước khi permission này bị loại bỏ.
- Giữ nguyên attendance Discord, lịch sử attendance, member/guild management, và GvG participation; attendance không còn cung cấp luồng import vào lineup.
- Chuyển giá trị tab `teams` đã lưu cục bộ sang tab hợp lệ khi ứng dụng khởi động.

## Capabilities

### New Capabilities

- Không có.

### Modified Capabilities

- `lineup-management`: Loại bỏ hoàn toàn capability lineup, persistence, snapshots, skills, API và UI liên quan.
- `attendance-lineup-simplification`: Giữ attendance hai trạng thái và loại bỏ dependency/entrypoint import attendance vào lineup.
- `member-management`: Loại bỏ dữ liệu và API kỹ năng chỉ dùng cho lineup; bảo toàn quản lý thành viên độc lập.

## Impact

- Frontend app shell/navigation, active-tab storage, app-state loader/realtime handling, lineup feature subtree và API/types lineup.
- Backend route registration, lineup persistence/lock service, app-state, serializers, realtime reasons, permissions, member skill endpoints và guild reset.
- Prisma schema và migration mới để xóa bảng/relations lineup legacy và dynamic, snapshots, skills và member skills.
- API consumers phải ngừng gửi/đọc layout, snapshot, skill và lineup lock data; attendance admin phải tiếp tục có quyền hoạt động mà không phụ thuộc `manage:lineup`.
