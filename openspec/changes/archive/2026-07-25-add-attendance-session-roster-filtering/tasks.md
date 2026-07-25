## 1. Data model và backend contract

- [x] 1.1 Thêm nullable attendance session roster source vào Prisma GvG lineup, tạo migration và cập nhật Prisma relation/serialization để canonical lineup trả source session.
- [x] 1.2 Bổ sung owner-only API mutation để chọn hoặc reset roster source; validate AttendanceSession thuộc active guild và publish canonical `gvg_lineup_updated`.
- [x] 1.3 Cập nhật `updateGvgLineupSquadSlots` để khi roster source tồn tại, chỉ cho assignment mới của member active có vote `GO`; giữ existing assignment trong chính squad như grandfathered exception.
- [x] 1.4 Cập nhật request/response types và route validation cho roster source API cùng canonical lineup response.

## 2. Frontend roster source và eligibility UX

- [x] 2.1 Mở rộng frontend lineup types/API và app state wiring để truyền attendance state cùng persisted roster source vào `GvgLineupWorkspace`.
- [x] 2.2 Thêm source selector hiển thị `Tất cả thành viên` và session GvG/Scrim available, với type, thời điểm, status và số vote `GO`.
- [x] 2.3 Mở rộng candidate helper/member picker để lọc member active chưa được gán theo vote `GO` khi session được chọn, vẫn render current-slot member nếu assignment đó đã tồn tại.
- [x] 2.4 Hiển thị eligibility counts và warning có thể truy cập được cho assignment không còn `GO`; reset source về all members mà không thay đổi slot hiện có.
- [x] 2.5 Đảm bảo attendance realtime refresh làm mới source options, counts, candidate list và warning mà không làm mất canonical lineup state.

## 3. Kiểm thử và xác minh

- [x] 3.1 Bổ sung backend test cho source selection authorization/guild ownership, canonical serialization, `GO` validation, no-source fallback, và retained ineligible assignment.
- [x] 3.2 Bổ sung frontend/helper test cho eligible candidate filtering, GvG/Scrim session selection, all-member fallback và warning state.
- [x] 3.3 Chạy Prisma generate/migration validation, backend test suite + type-check, frontend lint/build; sửa các failure liên quan.
