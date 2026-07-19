## 1. Refactor attendance history details structure

- [x] 1.1 Tách `SessionDetailsPanel` thành các vùng UI rõ ràng cho header context, summary, filter toolbar và chi tiết danh sách
- [x] 1.2 Bổ sung các computed values cần thiết cho summary như tổng active members, số người chưa điểm danh và tiến độ phản hồi
- [x] 1.3 Giữ nguyên behavior lọc theo search, choice và class trong cấu trúc UI mới

## 2. Redesign detailed review sections

- [x] 2.1 Thiết kế lại phần summary cards để hiển thị `GO`, `NOGO`, `chưa điểm danh`, tổng active members và progress
- [x] 2.2 Thiết kế lại khu vực danh sách vote để dễ quét mắt hơn, vẫn hiển thị tên, class, choice và thời điểm cập nhật
- [x] 2.3 Tổ chức lại khu vực `NotVotedTable` thành nhóm review rõ ràng và cân bằng hơn với danh sách đã điểm danh

## 3. Polish responsive behavior and validation

- [x] 3.1 Điều chỉnh spacing, border/background density và responsive layout cho modal chi tiết lịch sử điểm danh
- [x] 3.2 Kiểm tra lại rendering với closed sessions và empty states để bảo đảm flow attendance hiện tại không bị ảnh hưởng
- [x] 3.3 Chạy frontend validation phù hợp sau khi chỉnh UI và ghi nhận kết quả

## 4. Legacy MAYBE compatibility

- [x] 4.1 Model raw legacy `MAYBE` votes separately from current `GO`/`NOGO` choices at the frontend API-read boundary.
- [x] 4.2 Normalize history-detail calculations and rendering to current choices only, classify MAYBE-only members as unresponded, and prevent obsolete status badges from rendering.
- [x] 4.3 Run frontend lint/build and manually verify normal and legacy MAYBE attendance history sessions. (Frontend lint and production build passed; manual legacy-session verification skipped because the user confirmed no existing database contains MAYBE data.)
