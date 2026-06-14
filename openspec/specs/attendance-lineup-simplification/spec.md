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
Attendance import vào lineup SHALL chỉ nhập một danh sách thành viên hợp lệ và SHALL NOT tạo reserve import path.

#### Scenario: User opens attendance import modal
- **WHEN** người dùng mở modal nhập từ điểm danh trong màn hình lineup
- **THEN** hệ thống SHALL NOT hiển thị summary hoặc hành động dành cho `Dự bị`
- **THEN** hệ thống SHALL NOT hiển thị checkbox thêm người chưa điểm danh vào dự bị

#### Scenario: User imports attendance into lineup
- **WHEN** người dùng xác nhận import attendance
- **THEN** hệ thống SHALL chỉ nhập lane thành viên hợp lệ vào các slot chính còn trống
- **THEN** hệ thống SHALL NOT tạo hoặc gán thành viên vào reserve slots

### Requirement: Legacy attendance data with MAYBE remains readable
Hệ thống SHALL tiếp tục đọc được attendance session cũ có vote `MAYBE`, nhưng SHALL không dùng trạng thái này để tạo reserve behavior mới.

#### Scenario: Render a legacy attendance session
- **WHEN** hệ thống đọc một attendance session cũ có vote `MAYBE`
- **THEN** hệ thống SHALL render session đó an toàn mà không làm hỏng flow hiện tại
- **THEN** hệ thống SHALL NOT tái tạo lựa chọn `MAYBE` cho vote mới từ session đó
