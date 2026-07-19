## ADDED Requirements

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
