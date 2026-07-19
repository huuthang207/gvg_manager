## ADDED Requirements

### Requirement: Attendance workspace prioritizes daily operations
Hệ thống SHALL trình bày workspace Điểm danh Bang Chiến với thứ bậc ưu tiên phiên attendance hiện tại, action vận hành hằng ngày và lịch sử attendance gần đây; SHALL NOT hiển thị sidebar quản trị cố định trên workspace mặc định.

#### Scenario: User opens attendance workspace with an active session
- **WHEN** người dùng mở màn Điểm danh Bang Chiến trong khi có phiên attendance đang mở
- **THEN** hệ thống MUST hiển thị thẻ phiên hiện tại với trạng thái, thời điểm, tổng `GO` và `NOGO`
- **THEN** hệ thống MUST cung cấp action `Chi tiết`, `Làm mới` và `Đóng phiên` trên thẻ phiên hiện tại
- **THEN** hệ thống MUST NOT hiển thị một action `Làm mới` hoặc `Đóng phiên` trùng lặp ở khu vực khác của workspace chính

#### Scenario: User opens attendance workspace without an active session
- **WHEN** người dùng mở màn Điểm danh Bang Chiến khi không có phiên attendance đang mở
- **THEN** hệ thống MUST hiển thị empty state giải thích rằng chưa có phiên điểm danh
- **THEN** empty state MUST cung cấp CTA để mở phiên điểm danh mới

### Requirement: Attendance workspace separates quick actions from secondary management
Hệ thống SHALL hiển thị action chốt tham gia bang chiến trong khu vực action nhanh của workspace và SHALL đưa cấu hình hoặc thao tác quản trị ít dùng vào khu vực `Quản lý` phụ.

#### Scenario: User accesses attendance management
- **WHEN** người dùng chọn `Quản lý` từ workspace Điểm danh Bang Chiến
- **THEN** hệ thống MUST mở một khu vực quản lý riêng chứa cấu hình kênh Discord
- **THEN** khu vực này MUST cung cấp truy cập đến lịch sử chốt tham gia bang chiến và thao tác xóa dữ liệu bang chiến theo tháng
- **THEN** workspace chính MUST không hiển thị control xóa dữ liệu bang chiến thường trực

#### Scenario: User views available quick actions
- **WHEN** workspace Điểm danh Bang Chiến render action nhanh
- **THEN** hệ thống MUST cung cấp action chốt tham gia bang chiến
- **THEN** hệ thống MUST NOT cho phép mở thêm phiên attendance khi một phiên đang mở

### Requirement: Recent attendance history is read-focused
Hệ thống SHALL trình bày lịch sử attendance gần đây như danh sách các phiên có thể mở để review, không đưa select hoặc delete control hàng loạt vào danh sách gần đây.

#### Scenario: User views recent history
- **WHEN** có các phiên attendance đã đóng trong lịch sử gần đây
- **THEN** mỗi hàng lịch sử MUST hiển thị ngữ cảnh phiên, thời điểm và summary `GO`/`NOGO`
- **THEN** người dùng MUST có thể mở chi tiết của phiên từ hàng đó
- **THEN** hàng lịch sử MUST NOT hiển thị checkbox hoặc action xóa trực tiếp

#### Scenario: User needs attendance history cleanup
- **WHEN** người dùng chọn xem toàn bộ lịch sử attendance
- **THEN** hệ thống MUST cung cấp các action chọn và xóa lịch sử trong modal hoặc chế độ quản lý lịch sử
- **THEN** hệ thống MUST tiếp tục yêu cầu xác nhận trước khi xóa lịch sử
