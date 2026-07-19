## ADDED Requirements

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
