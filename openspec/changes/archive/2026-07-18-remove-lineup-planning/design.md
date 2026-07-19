## Context

Ứng dụng hiện có hai lớp persistence cho lineup: legacy `Team`/`TeamSlot` theo division và dynamic `SquadGroup`/`SquadTeam`/`SquadTeamSlot`; lớp dynamic còn có edit lock, saved snapshots, slot skills và realtime app-state updates. Frontend duy trì tab `teams`, localStorage active-tab, feature subtree drag-and-drop, API client và các type tương ứng. `Skill`/`MemberSkill` chỉ được dùng để gán skill trong lineup/snapshot.

Attendance Discord là domain độc lập: bot ghi attendance sessions/votes, frontend hiển thị active/history, và GvG participation có thể dùng GO votes. Lineup chỉ đọc attendance để import member. Một số attendance admin routes hiện được bảo vệ bằng `manage:lineup`, nên quyền này phải được thay thế trước khi xóa domain lineup.

## Goals / Non-Goals

**Goals:**
- Loại bỏ hoàn toàn UI, API, persistence, realtime, permission và contracts của lineup legacy/dynamic/snapshot.
- Xóa vĩnh viễn dữ liệu lineup và dữ liệu skills chỉ phục vụ lineup qua một forward Prisma migration.
- Duy trì đầy đủ attendance Discord, attendance history, member/guild management và GvG participation sau thay đổi.
- Đưa người dùng có localStorage tab `teams` trở về một tab hợp lệ an toàn.

**Non-Goals:**
- Không thay đổi semantics GO/NOGO, Discord bot attendance, lịch sử attendance, hoặc GvG participation.
- Không giữ một UI/API/archive để xem hoặc khôi phục saved lineups sau migration.
- Không chỉnh sửa hay xóa migration lịch sử đã được deploy.
- Không mở rộng fixes ngoài phạm vi lineup, ngoại trừ các dependency bắt buộc để attendance hoạt động độc lập.

## Decisions

### 1. Dùng forward destructive migration, không để lại bảng lineup/skill không dùng

Migration mới sẽ drop theo thứ tự phụ thuộc: snapshot slots → teams → groups → snapshot; squad slots → teams → groups; legacy slots → teams; `MemberSkill`; `Skill`. Prisma schema và relations `Guild`/`Member` sẽ được thu gọn đồng thời.

**Rationale:** Product đã quyết định xóa hoàn toàn dữ liệu. Giữ bảng không còn consumer tạo nợ kỹ thuật, còn sửa migration lịch sử làm database đã deploy không nhất quán.

**Alternatives considered:**
- Chỉ ẩn UI/API và giữ bảng: từ chối vì dữ liệu không thể truy cập và domain vẫn phải bảo trì.
- Export/archive dữ liệu trước rồi drop: không thực hiện vì yêu cầu đã chốt xóa hoàn toàn; chỉ cần backup vận hành trước deploy.

### 2. Xóa cả legacy và dynamic lineup paths trong một thay đổi

Loại bỏ `divisions` cùng `Team`/`TeamSlot`, và loại bỏ `squadGroups`, snapshot, lock, serializer và route dynamic. App-state chỉ trả các domain còn lại.

**Rationale:** Rà soát cho thấy legacy team chỉ còn được app-state/serializer/reset đọc; frontend không còn consumer thực tế. Giữ một trong hai domain sẽ tạo contract dead data.

**Alternatives considered:**
- Giữ legacy division model: từ chối vì nó không có UI hay consumer nghiệp vụ độc lập.

### 3. Tách authorization attendance trước khi xoá permission lineup

Thay các attendance operation đang dùng `manage:lineup` bằng permission attendance chuyên biệt (ví dụ `manage:attendance`) hoặc một permission quản trị tồn tại với semantics phù hợp. Loại `manage:lineup`, `manage:snapshots`, `restore:snapshots` chỉ sau khi không còn route/service consumer.

**Rationale:** Attendance phải tiếp tục vận hành dù lineup bị xóa. Một permission mang tên lineup không được là dependency ẩn của attendance.

**Alternatives considered:**
- Dùng một quyền quản trị tổng quát không rõ semantics: chỉ chọn nếu permission model hiện hữu đã định nghĩa đúng mức truy cập; không để attendance phụ thuộc lại vào tên lineup.

### 4. Loại bỏ skills cùng layout

Xóa models, serializer fields, member skill routes/actions và UI/types dùng `assignedSkills`; gỡ skill clearing khỏi member/lineup flows.

**Rationale:** Phạm vi đã chốt skill chỉ có giá trị trong lineup và snapshot. Sau khi không còn slot, skill không còn user-facing purpose.

**Alternatives considered:**
- Giữ skills như profile metadata: từ chối vì sẽ cần capability, UI và quyền độc lập ngoài scope.

### 5. Migrate active tab phía client thay vì hỗ trợ tab đã xóa

`activeTabStorage`/tab selection sẽ validate persisted tab against tập tab hiện hành. Giá trị `teams` hoặc bất kỳ giá trị invalid nào được thay bằng fallback hợp lệ và được lưu lại.

**Rationale:** Ngăn user quay lại trạng thái không render được sau release; không cần server migration cho localStorage.

### 6. Gỡ realtime lineup semantic thay vì bỏ toàn bộ WebSocket

Xóa lineup-specific publish reasons, lock refresh và frontend refresh handling; giữ websocket auth/subscription và reasons của attendance/member/guild domains.

**Rationale:** Realtime còn cần thiết cho attendance và member state. Xóa toàn bộ gateway sẽ gây regression không liên quan.

## Risks / Trade-offs

- [Migration phá hủy dữ liệu lineup/snapshot/skill không thể rollback bằng code] → backup production database, thử migration trên bản sao và chỉ rollback application bằng restore database backup nếu cần.
- [Attendance admin bị mất quyền] → inventory toàn bộ use of `manage:lineup`, chuyển chúng trước khi remove permission, và regression-test config/open/close/refresh/delete/history attendance.
- [Client cũ gọi API đã xóa trong rollout lệch phiên bản] → deploy backend/frontend cùng release; API removal trả 404 rõ ràng cho client stale trong thời gian cache ngắn.
- [Stale `teams` tab trong localStorage] → normalize tab trong app bootstrap và test persisted legacy value.
- [Foreign keys hoặc reset guild còn tham chiếu models bị drop] → cập nhật schema, settings reset, includes, serializers và tests trong cùng change; chạy `prisma generate`, typecheck và migration test.
- [Member deletion logic từng dựa vào SetNull trên lineup slots] → remove obsolete relations và kiểm thử delete/soft-delete member không phụ thuộc lineup.

## Migration Plan

1. Backup database và kiểm tra số record của tất cả bảng bị xóa.
2. Triển khai code tách authorization attendance và loại bỏ toàn bộ consumer lineup/skill; đảm bảo build/test pass với schema mới.
3. Áp dụng forward Prisma migration drop child tables trước parent tables và xóa `Skill`/`MemberSkill`.
4. Deploy frontend/backend tương thích trong cùng release; invalid local `teams` tab tự fallback.
5. Smoke test login, guild switching, member management, active/history attendance, Discord vote refresh, GvG attendance selection, guild reset và websocket updates.
6. Nếu deployment lỗi sau migration, rollback application code chỉ để chẩn đoán; rollback dữ liệu đòi restore backup vì migration là destructive.

## Open Questions

- Không còn câu hỏi product-blocking: scope đã chốt xóa toàn bộ lineup, snapshots và lineup-only skills, đồng thời giữ attendance.
- Trong implementation cần xác minh permission attendance đích phù hợp với permission model hiện hữu và ghi rõ mapping cuối cùng trong code/tests.
