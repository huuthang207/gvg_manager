## ADDED Requirements

### Requirement: Member detail modal preserves management behavior during visual restyling
Giao diện quản lý thành viên MUST giữ nguyên quyền truy cập và các interaction hiện có khi modal Chi tiết thành viên được chuẩn hóa giao diện.

#### Scenario: Authorized manager opens the detail modal
- **WHEN** người dùng có `canManageMembers` chọn một dòng thành viên
- **THEN** hệ thống MUST mở modal Chi tiết thành viên cho thành viên đã chọn
- **THEN** modal MUST tiếp tục cung cấp cập nhật tên ingame, đổi phái, đồng bộ Discord role và action gỡ role Bang Viên

#### Scenario: Non-manager views the member list
- **WHEN** người dùng không có `canManageMembers` xem danh sách thành viên
- **THEN** hệ thống MUST NOT mở modal quản trị Chi tiết thành viên từ thao tác chọn dòng

#### Scenario: Existing dialog dismissal behavior is used after restyling
- **WHEN** người dùng đóng dialog bằng nút đóng, thao tác pointer trực tiếp trên backdrop hoặc lưu thay đổi hợp lệ thành công
- **THEN** hệ thống MUST tiếp tục đóng modal theo behavior hiện có
- **THEN** các requirement bảo toàn text selection và pointer interaction trong modal MUST vẫn được áp dụng
