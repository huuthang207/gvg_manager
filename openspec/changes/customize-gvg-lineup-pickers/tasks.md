## 1. Chuẩn bị trạng thái và helper UI

- [x] 1.1 Bổ sung type/helper nội bộ cho effective class, class-colored slot style, định danh popup theo slot và lọc member theo search query mà không thay đổi payload lineup.
- [x] 1.2 Thêm test cho các helper candidate/effective class cần thiết, bao gồm filter class, search query, member hiện tại và fallback trạng thái neutral.

## 2. Class picker và phản hồi màu slot

- [x] 2.1 Thay native class `<select>` trong `GvgLineupWorkspace` bằng class trigger và popup dark-theme chứa unfiltered action cùng icon/tên của mọi class.
- [x] 2.2 Áp dụng nền/viền alpha theo class filter với slot trống và theo `classType` của assigned member; hiển thị fallback accessible cho class không có icon.
- [x] 2.3 Quản lý một class/member popup mở tại một thời điểm; đóng qua chọn option, click ngoài và `Escape` mà không kích hoạt squad drag.

## 3. Member picker dark-theme

- [x] 3.1 Thay native member `<select>` bằng member trigger và popup dark-theme có ô tìm kiếm, danh sách scrollable, class icon/badge, trạng thái không có kết quả và lựa chọn slot trống.
- [x] 3.2 Kết nối member picker với quy tắc active/unassigned/current-member/class filter hiện có, đảm bảo search không làm thay đổi eligibility và đóng menu sau mutation thành công.
- [x] 3.3 Bổ sung keyboard/accessibility semantics cho trigger, popup, input search và option; đảm bảo focus/escape/click-outside hoạt động nhất quán.

## 4. Kiểm chứng giao diện

- [x] 4.1 Chạy frontend TypeScript check và sửa mọi lỗi type/lint phát sinh.
- [x] 4.2 Kiểm tra thủ công workspace ở desktop/narrow viewport: các popup không bị cắt, scroll/menu dark dễ đọc, icon/màu khớp class, và drag/clear squad vẫn hoạt động.
