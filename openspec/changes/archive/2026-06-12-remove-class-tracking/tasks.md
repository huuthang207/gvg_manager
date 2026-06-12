## 1. Remove data model tracking

- [x] 1.1 Xóa `previousClassType` và `classChangedAt` khỏi Prisma `Member` model
- [x] 1.2 Tạo Prisma migration drop columns class-change tracking khỏi bảng `Member`
- [x] 1.3 Regenerate Prisma client sau khi schema thay đổi

## 2. Remove backend tracking behavior

- [x] 2.1 Cập nhật Discord member sync để chỉ update `classType` hiện tại, không set `previousClassType` hoặc `classChangedAt`
- [x] 2.2 Gỡ service method acknowledge class change và mọi logic clear class-change tracking
- [x] 2.3 Gỡ backend route `POST /api/members/:memberId/class-change/ack`
- [x] 2.4 Cập nhật member serializer để không trả về `previousClassType` hoặc `classChangedAt`

## 3. Remove frontend class-change UI and API usage

- [x] 3.1 Gỡ frontend API helper `acknowledgeClassChange` và export/import liên quan
- [x] 3.2 Gỡ callback/action `handleAcknowledgeClassChange` khỏi app/member action wiring
- [x] 3.3 Gỡ badge/tooltip `Đổi phái` khỏi member list trong `MemberDashboard`
- [x] 3.4 Gỡ section `Đã đổi phái: A → B` và nút `Đã xử lý` khỏi member detail modal
- [x] 3.5 Gỡ icon cảnh báo class-change tracking khỏi lineup `MemberCard`
- [x] 3.6 Cập nhật frontend member types để không còn `previousClassType` hoặc `classChangedAt`

## 4. Update tests and references

- [x] 4.1 Cập nhật backend serializer/service test fixtures và assertions liên quan đến class-change tracking
- [x] 4.2 Grep toàn repo để đảm bảo không còn references tới `previousClassType`, `classChangedAt`, `acknowledgeClassChange`, hoặc `class-change/ack` ngoài artifacts/archive nếu có chủ đích
- [x] 4.3 Chạy backend tests/typecheck phù hợp sau khi thay đổi
- [x] 4.4 Chạy frontend typecheck/build phù hợp sau khi thay đổi

## 5. Validate behavior

- [x] 5.1 Xác minh sync thành viên vẫn cập nhật `classType` hiện tại khi Discord role mapping thay đổi
- [x] 5.2 Xác minh UI thành viên và lineup chỉ hiển thị phái hiện tại, không còn cảnh báo đổi phái
- [x] 5.3 Xác minh API/state response không còn fields class-change tracking
