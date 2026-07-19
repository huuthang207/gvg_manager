## REMOVED Requirements

### Requirement: Lineup screen excludes assignment summary features
**Reason**: Toàn bộ capability Sắp Xếp Đội Hình, gồm live layout, drag-and-drop, leader selection, attendance import, export, lock và saved snapshots, đã bị loại khỏi sản phẩm.

**Migration**: Frontend MUST loại bỏ tab `teams`, toàn bộ entrypoint/component/hook/API/type lineup và normalize giá trị tab `teams` đã lưu sang tab hợp lệ. Backend MUST loại bỏ routes, services, serializers, app-state fields, realtime reasons, permissions và persistence lineup legacy/dynamic/snapshot; forward migration MUST xóa dữ liệu và bảng legacy `Team`/`TeamSlot`, `SquadGroup`/`SquadTeam`/`SquadTeamSlot`, và `LineupSnapshot` hierarchy.

### Requirement: Lineup persistence excludes member note metadata
**Reason**: Lineup persistence không còn tồn tại sau khi feature được xóa toàn bộ.

**Migration**: Backend MUST loại bỏ persistence payload và endpoints cho layout, locks và snapshots; application state MUST NOT expose `divisions`, `squadGroups`, `lineupLock` hoặc snapshot data.

### Requirement: Legacy snapshots with memberNotes remain restorable
**Reason**: Saved lineup snapshots bị xóa vĩnh viễn theo quyết định product, nên không còn restore path hay yêu cầu tương thích snapshot lịch sử.

**Migration**: Forward database migration MUST xóa `LineupSnapshot`, `LineupSnapshotGroup`, `LineupSnapshotTeam` và `LineupSnapshotSlot` sau khi backup vận hành được hoàn thành; ứng dụng MUST NOT expose snapshot read/save/restore APIs.
