## Purpose

Quy định giao diện nhất quán, gọn gàng và khả năng truy cập cho modal Chi tiết thành viên trong luồng quản lý thành viên.

## Requirements

### Requirement: Member detail modal follows the administrative modal visual system
Hệ thống MUST hiển thị modal Chi tiết thành viên với shell giao diện nhất quán với các modal quản trị hiện tại: backdrop tối có blur, panel nền slate tối có border, header gọn gồm icon, tiêu đề, mô tả và nút đóng, cùng footer rõ ràng.

#### Scenario: Manager opens a member detail dialog
- **WHEN** người dùng có quyền quản lý thành viên chọn một thành viên trong danh sách
- **THEN** hệ thống MUST mở dialog có header chứa biểu tượng, tiêu đề `Chi tiết thành viên`, mô tả ngắn và nút đóng có accessible name
- **THEN** dialog MUST dùng bề mặt, border, spacing và hierarchy slate tối tương thích với modal quản trị hiện tại

#### Scenario: Dialog is viewed on a small viewport
- **WHEN** dialog Chi tiết thành viên được mở trên viewport có chiều cao giới hạn
- **THEN** header và footer MUST vẫn truy cập được
- **THEN** vùng nội dung MUST cuộn thay vì làm dialog tràn ngoài viewport

### Requirement: Member detail actions use a compact visual hierarchy
Hệ thống MUST nhóm nội dung modal thành nhận diện thành viên, hồ sơ ingame và quản lý phái; các action MUST dùng style button chuẩn của ứng dụng tương ứng với mức độ primary, secondary hoặc dangerous. Thông tin Discord đã có trong vùng nhận diện MUST không hiển thị lại thành một grid riêng.

#### Scenario: Manager reviews member information and editing controls
- **WHEN** modal Chi tiết thành viên render một thành viên
- **THEN** hệ thống MUST hiển thị avatar hoặc fallback, tên Discord, username khi có, và badge phái hiện tại trong vùng nhận diện
- **THEN** hệ thống MUST hiển thị riêng các control cập nhật tên ingame và đổi phái theo nhóm nội dung rõ ràng
- **THEN** hệ thống MUST NOT hiển thị một grid hoặc section Thông tin Discord riêng biệt

#### Scenario: Manager sees the role removal action
- **WHEN** modal Chi tiết thành viên render action gỡ role Bang Viên
- **THEN** hệ thống MUST hiển thị action này dưới dạng một nút compact với visual treatment dangerous
- **THEN** action MUST không được trình bày như action lưu thông thường hoặc một khu vực cảnh báo chiếm nhiều không gian

### Requirement: Member detail dialog exposes accessible semantics
Hệ thống MUST đánh dấu panel Chi tiết thành viên là dialog modal và liên kết accessible name của dialog với tiêu đề hiển thị.

#### Scenario: Assistive technology reads an opened dialog
- **WHEN** modal Chi tiết thành viên được mở
- **THEN** panel MUST có `role="dialog"` và `aria-modal="true"`
- **THEN** panel MUST có `aria-labelledby` tham chiếu đến phần tử tiêu đề dialog
