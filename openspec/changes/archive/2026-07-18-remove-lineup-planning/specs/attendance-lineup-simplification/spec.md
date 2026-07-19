## MODIFIED Requirements

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
