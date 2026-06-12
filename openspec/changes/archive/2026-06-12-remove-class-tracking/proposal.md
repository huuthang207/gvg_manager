## Why

Tính năng ghi nhận và hiển thị trạng thái “đã đổi phái” làm UI thành viên phức tạp hơn nhu cầu hiện tại và tạo thêm state cần xử lý thủ công qua nút acknowledge. Việc loại bỏ class-change tracking giúp luồng đồng bộ thành viên đơn giản hơn: phái hiện tại luôn phản ánh dữ liệu mới nhất từ Discord hoặc thao tác quản lý, không còn cảnh báo lịch sử đổi phái.

## What Changes

- Gỡ logic backend dùng để phát hiện và lưu lịch sử đổi phái (`previousClassType`, `classChangedAt`) trong quá trình đồng bộ thành viên.
- Gỡ các trường class-change tracking khỏi API response/types nếu không còn được sử dụng.
- Gỡ UI hiển thị badge/icon/cảnh báo “Đổi phái” và section “Đã đổi phái: A → B”.
- Gỡ hành động/API acknowledge class change vì không còn trạng thái đổi phái cần xử lý.
- Thêm Prisma migration để loại bỏ columns liên quan nếu schema hiện tại đang lưu class-change tracking.
- Không thay đổi behavior đồng bộ phái hiện tại: `classType` vẫn được cập nhật theo role mapping mới nhất.

## Capabilities

### New Capabilities
- `member-sync`: Quy định behavior đồng bộ thành viên sau khi bỏ theo dõi lịch sử đổi phái; đồng bộ chỉ cập nhật phái hiện tại mà không phát sinh trạng thái cảnh báo đổi phái.
- `member-management`: Quy định behavior quản lý/hiển thị thành viên sau khi bỏ UI/API xử lý trạng thái đổi phái đã được ghi nhận.

### Modified Capabilities
- None.

## Impact

- Affected backend code: `backend/src/discordSync.ts`, `backend/src/services/memberService.ts`, `backend/src/routes/memberRoutes.ts`, `backend/src/serializers/memberSerializer.ts`.
- Affected database: `backend/prisma/schema.prisma` và migration loại bỏ `previousClassType`, `classChangedAt` nếu đang tồn tại.
- Affected frontend code: member types, API helpers, `MemberDashboard`, `MemberCard`, `useMemberActions`, và các nơi consume `previousClassType`/`classChangedAt`.
- Affected tests: serializer/service tests có fixtures hoặc assertions liên quan đến class-change tracking.
- Breaking behavior: người dùng sẽ không còn thấy cảnh báo “Đã đổi phái” hoặc cần bấm “Đã xử lý”; dữ liệu lịch sử đổi phái cũ sẽ bị loại bỏ nếu migration xóa columns.