## Context

Hiện tại hệ thống đồng bộ thành viên từ Discord không chỉ cập nhật `classType` hiện tại mà còn lưu thêm lịch sử đổi phái qua `previousClassType` và `classChangedAt`. Dữ liệu này được serialize về frontend để hiển thị badge/icon cảnh báo “Đổi phái”, section “Đã đổi phái: A → B” trong modal chi tiết, và một API acknowledge để người quản lý đánh dấu đã xử lý.

Change này là cross-cutting vì ảnh hưởng đồng thời tới Prisma schema/database, backend sync logic, API response contract, frontend types, UI thành viên, lineup card, và tests. Mục tiêu là loại bỏ toàn bộ class-change tracking, nhưng vẫn giữ behavior cốt lõi: khi đồng bộ hoặc quản lý role phái, `classType` của thành viên vẫn phản ánh trạng thái hiện tại mới nhất.

## Goals / Non-Goals

**Goals:**
- Gỡ hoàn toàn trạng thái lịch sử đổi phái khỏi data model và API contract.
- Gỡ UI cảnh báo/badge/icon “Đổi phái” và section “Đã đổi phái: A → B”.
- Gỡ API/action acknowledge class change vì không còn state cần acknowledge.
- Đảm bảo sync Discord vẫn cập nhật `classType` hiện tại bình thường.
- Cập nhật tests/types để không còn phụ thuộc `previousClassType` hoặc `classChangedAt`.

**Non-Goals:**
- Không thay đổi thuật toán map Discord roles sang phái hiện tại.
- Không thay đổi danh sách phái, màu sắc phái, hoặc role configuration UI ngoài phần cảnh báo đổi phái.
- Không thêm cơ chế audit/history thay thế cho đổi phái.
- Không thay đổi behavior quản lý Discord role khi manager đổi phái thủ công, ngoài việc không còn tạo/trả về tracking state.

## Decisions

### 1. Xóa tận gốc class-change tracking thay vì chỉ ẩn UI
**Decision:** Loại bỏ `previousClassType` và `classChangedAt` khỏi Prisma model, serializer, frontend types, và UI consumers.

**Why:** Người dùng muốn bỏ tính năng này, và việc chỉ ẩn UI vẫn giữ state/backend logic không còn giá trị sử dụng. Xóa tận gốc giúp giảm độ phức tạp, tránh trạng thái “âm thầm lưu nhưng không ai xử lý”, và giảm surface area trong API.

**Alternatives considered:**
- Chỉ ẩn UI: ít rủi ro hơn nhưng để lại backend tracking và database columns không còn mục đích.
- Giữ fields nhưng ngừng set mới: vẫn còn API/types dư thừa và dữ liệu lịch sử cũ gây nhầm lẫn.

### 2. Giữ `classType` là source of truth duy nhất cho phái hiện tại
**Decision:** Sau change, mỗi member chỉ cần `classType` để biểu diễn phái hiện tại. Sync Discord và thao tác manager vẫn update trực tiếp `classType`.

**Why:** Nhu cầu hiện tại là biết phái hiện tại để xếp đội hình, lọc/thống kê, và hiển thị thành viên. Lịch sử đổi phái không còn là requirement.

**Alternatives considered:**
- Tạo bảng audit riêng cho class changes: vượt scope và trái mục tiêu đơn giản hóa.
- Giữ transient notification ở frontend: vẫn cần diff/logic mới, trong khi mục tiêu là bỏ thông báo đổi phái.

### 3. Gỡ acknowledge API và frontend action liên quan
**Decision:** Xóa endpoint `POST /api/members/:memberId/class-change/ack`, service method `acknowledgeMemberClassChange`, API helper `acknowledgeClassChange`, và callback/action trên frontend.

**Why:** Acknowledge chỉ có ý nghĩa khi còn tracking state. Nếu không còn `previousClassType`/`classChangedAt`, endpoint này trở thành API chết và dễ gây hiểu nhầm cho consumer.

**Alternatives considered:**
- Giữ endpoint no-op để backward compatible: không cần thiết nếu app không có external API consumers được cam kết, và no-op che giấu việc behavior đã bị loại bỏ.

### 4. Migration database sẽ drop columns class-change tracking
**Decision:** Thêm Prisma migration để xóa `previousClassType` và `classChangedAt` khỏi bảng `Member` nếu schema hiện tại có hai columns này.

**Why:** Đây là removal có chủ đích. Giữ columns trong DB nhưng không dùng tạo technical debt và khiến schema không phản ánh domain model mới.

**Alternatives considered:**
- Chỉ xóa khỏi Prisma model mà không migration: không nhất quán và có thể gây drift.
- Giữ columns nullable: giảm risk rollback nhưng không đạt mục tiêu xóa tận gốc.

### 5. Tests phải phản ánh API contract mới
**Decision:** Cập nhật fixtures/assertions để không kỳ vọng `previousClassType` và `classChangedAt` trong serialized member response.

**Why:** Tests đang đóng vai trò contract. Nếu fields bị gỡ khỏi serializer/types, tests phải xác nhận output mới không còn class-change tracking.

**Alternatives considered:**
- Giữ fields trong serializer với giá trị `null`: vẫn giữ API contract cũ và không thật sự remove feature.

## Risks / Trade-offs

- **[Mất dữ liệu lịch sử đổi phái cũ]** → Mitigation: xem đây là behavior mong muốn của change; nếu cần backup, export DB trước migration ngoài phạm vi implementation.
- **[Frontend còn reference field đã xóa gây TypeScript/runtime lỗi]** → Mitigation: grep toàn repo cho `previousClassType`, `classChangedAt`, `acknowledgeClassChange`, `class-change/ack` và gỡ hết references.
- **[Tests fixtures còn field cũ]** → Mitigation: chạy backend/frontend type checks và test suites liên quan sau khi cập nhật fixtures.
- **[Migration rollback không khôi phục dữ liệu cũ]** → Mitigation: Prisma migration drop columns là destructive; rollback chỉ có thể re-add columns trống, không khôi phục historical values.
- **[External consumer nếu có đang gọi acknowledge endpoint]** → Mitigation: repo hiện không thể hiện public contract cho endpoint này; nếu có consumer ngoài repo thì cần thông báo breaking behavior trước deploy.

## Migration Plan

1. Cập nhật Prisma schema để xóa `previousClassType` và `classChangedAt` khỏi model `Member`.
2. Tạo migration SQL drop hai columns tương ứng khỏi bảng `Member`.
3. Gỡ backend logic set/clear tracking trong sync và member service.
4. Gỡ route/API acknowledge class change.
5. Gỡ serializer fields và cập nhật backend tests.
6. Gỡ frontend types/API helper/actions/UI warnings.
7. Chạy typecheck/tests và xác minh sync thành viên vẫn cập nhật `classType` hiện tại.

Rollback nếu cần:
- Revert code change và migration bằng migration mới re-add columns nullable.
- Dữ liệu lịch sử đã drop sẽ không tự khôi phục nếu không có backup DB.

## Open Questions

- Có external client nào ngoài frontend hiện tại đang phụ thuộc vào `previousClassType`, `classChangedAt`, hoặc endpoint acknowledge không? Nếu có, cần coi đây là breaking API removal có truyền thông deploy riêng.
