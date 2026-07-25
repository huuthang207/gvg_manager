## MODIFIED Requirements

### Requirement: Attendance import excludes reserve and not-voted reserve flows
Attendance SHALL duy trì độc lập với lineup về lifecycle vote, Discord render và quản trị session. Hệ thống SHALL NOT cung cấp action hoặc modal import attendance members vào lineup từ attendance workspace. Guild owner MAY chọn một AttendanceSession hiện hữu làm nguồn eligibility cho workspace lineup; lựa chọn đó chỉ giới hạn assignment lineup mới theo vote `GO` và SHALL NOT làm attendance vote tạo hoặc cập nhật dữ liệu lineup.

#### Scenario: User views attendance controls and history
- **WHEN** người dùng mở attendance dashboard, active session hoặc history
- **THEN** hệ thống SHALL tiếp tục hiển thị và quản lý attendance theo các capability attendance hiện hành
- **THEN** hệ thống SHALL NOT hiển thị action hoặc modal import attendance vào lineup

#### Scenario: Owner uses attendance as a lineup roster source
- **WHEN** guild owner chọn một AttendanceSession GvG hoặc Scrim trong workspace lineup
- **THEN** workspace lineup MAY dùng vote `GO` của session đó để giới hạn assignment mới
- **THEN** attendance workspace, Discord message và attendance vote lifecycle SHALL không tạo hoặc cập nhật lineup assignment

#### Scenario: Attendance votes are persisted and refreshed through Discord
- **WHEN** một user bấm `GO` hoặc `NOGO` trên Discord attendance controls
- **THEN** hệ thống SHALL lưu vote và refresh state/message attendance như trước
- **THEN** hệ thống SHALL NOT tạo hoặc cập nhật lineup assignment
