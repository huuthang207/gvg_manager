## Purpose

Quy định behavior attendance và lineup sau khi loại bỏ hoàn toàn reserve/standby lane và lựa chọn `MAYBE`, để hệ thống chỉ còn các trạng thái tham gia chính và một lane thành viên trong đội hình.

## Requirements

### Requirement: Attendance flow excludes standby responses
Attendance flow SHALL chỉ hỗ trợ hai lựa chọn `GO` và `NOGO`, và SHALL NOT cung cấp lựa chọn `MAYBE` cho vote mới.

#### Scenario: User interacts with Discord attendance buttons
- **WHEN** hệ thống render Discord attendance controls cho một session đang mở
- **THEN** hệ thống SHALL chỉ hiển thị lựa chọn `Tham gia` và `Không tham gia`
- **THEN** hệ thống SHALL NOT hiển thị nút `Dự bị`

#### Scenario: System validates a new attendance vote
- **WHEN** người dùng gửi một attendance vote mới
- **THEN** hệ thống SHALL chỉ chấp nhận `GO` hoặc `NOGO` như các choice hợp lệ mới

### Requirement: Attendance import excludes reserve and not-voted reserve flows
Attendance SHALL duy trì độc lập với lineup và SHALL NOT cung cấp bất kỳ luồng, entrypoint hoặc API consumer nào để import attendance members vào đội hình.

#### Scenario: User views attendance controls and history
- **WHEN** người dùng mở attendance dashboard, active session hoặc history
- **THEN** hệ thống SHALL tiếp tục hiển thị và quản lý attendance theo các capability attendance hiện hành
- **THEN** hệ thống SHALL NOT hiển thị action hoặc modal import attendance vào lineup

#### Scenario: Attendance votes are persisted and refreshed through Discord
- **WHEN** một user bấm `GO` hoặc `NOGO` trên Discord attendance controls
- **THEN** hệ thống SHALL lưu vote và refresh state/message attendance như trước
- **THEN** hệ thống SHALL NOT tạo, cập nhật hoặc yêu cầu dữ liệu lineup

#### Scenario: Attendance admin authorizes an operation
- **WHEN** user thực hiện cấu hình, mở, đóng, refresh hoặc xóa attendance session
- **THEN** backend SHALL authorize bằng permission attendance hoặc permission quản trị tương đương không phải `manage:lineup`
- **THEN** thao tác SHALL không phụ thuộc route, service hoặc permission lineup đã bị xóa

### Requirement: Attendance management UI distinguishes operational and cleanup contexts
Hệ thống MUST giữ các thao tác attendance hiện hành sau khi flow chỉ hỗ trợ `GO` và `NOGO`, đồng thời phân tách thao tác vận hành hằng ngày với thao tác quản lý hoặc cleanup.

#### Scenario: User manages a current attendance session
- **WHEN** một phiên attendance đang mở
- **THEN** hệ thống MUST cho phép người dùng xem chi tiết, làm mới và đóng phiên từ ngữ cảnh phiên hiện tại
- **THEN** hệ thống MUST không cung cấp control trùng lặp cho cùng hành động trong workspace attendance chính

#### Scenario: User accesses historical cleanup
- **WHEN** người dùng cần xóa attendance history hoặc dữ liệu chốt bang chiến
- **THEN** hệ thống MUST đặt thao tác cleanup trong modal hoặc khu vực quản lý riêng
- **THEN** hệ thống MUST tiếp tục yêu cầu xác nhận trước khi thực hiện thao tác xóa

### Requirement: Legacy attendance data with MAYBE remains readable
Hệ thống SHALL tiếp tục đọc được attendance session cũ có vote `MAYBE`, nhưng SHALL không dùng trạng thái này để tạo reserve behavior mới và SHALL trình bày lịch sử attendance theo cấu trúc ưu tiên trạng thái phản hồi hiện hành `GO`/`NOGO` cùng nhóm chưa điểm danh.

#### Scenario: Render a legacy attendance session
- **WHEN** hệ thống đọc một attendance session cũ có vote `MAYBE`
- **THEN** hệ thống SHALL render session đó an toàn mà không làm hỏng flow hiện tại
- **THEN** hệ thống SHALL NOT tái tạo lựa chọn `MAYBE` cho vote mới từ session đó

#### Scenario: Render closed attendance history details after attendance simplification
- **WHEN** người dùng mở modal chi tiết của một attendance history session đã đóng
- **THEN** hệ thống SHALL trình bày summary và danh sách theo các trạng thái phản hồi hiện hành `GO`, `NOGO` và nhóm active members chưa điểm danh
- **THEN** hệ thống SHALL NOT tái tạo UI reserve/standby hoặc nhấn mạnh `MAYBE` như một trạng thái phản hồi mới

#### Scenario: Treat a legacy MAYBE response as unresponded
- **WHEN** một attendance session cũ có member active với vote `MAYBE` nhưng không có vote `GO` hoặc `NOGO`
- **THEN** modal lịch sử SHALL render an toàn mà không hiển thị badge, filter hoặc summary `MAYBE`
- **THEN** summary, progress, class composition và danh sách phản hồi SHALL chỉ tính các vote `GO` hoặc `NOGO`
- **THEN** member đó SHALL xuất hiện trong nhóm `Chưa phản hồi`

### Requirement: Attendance types preserve independent GO and NOGO flows
Hệ thống MUST hỗ trợ các attendance type độc lập trong khi tiếp tục giới hạn mỗi vote mới vào `GO` hoặc `NOGO`.

#### Scenario: Member responds to concurrent attendance types
- **WHEN** guild có đồng thời một phiên Bang Chiến và một phiên Scrim đang mở
- **THEN** thành viên MUST có thể gửi một lựa chọn `GO` hoặc `NOGO` riêng cho mỗi phiên
- **THEN** lựa chọn trên một phiên MUST NOT thay đổi vote hoặc trạng thái của phiên thuộc type còn lại

### Requirement: Existing Bang Chiến attendance remains available after type support
Hệ thống MUST xem attendance records và cấu hình được tạo trước khi có Scrim là Bang Chiến, đồng thời giữ các flow Bang Chiến hiện có hoạt động.

#### Scenario: System reads legacy attendance records
- **WHEN** hệ thống đọc một cấu hình hoặc phiên attendance có từ trước migration type
- **THEN** hệ thống MUST xử lý record đó như type Bang Chiến
- **THEN** người dùng MUST tiếp tục xem, refresh, đóng và review lịch sử Bang Chiến đó qua luồng Bang Chiến
