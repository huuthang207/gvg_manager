## ADDED Requirements

### Requirement: Member detail modal preserves editing during text selection
Giao diện quản lý thành viên MUST không đóng modal chi tiết thành viên khi một thao tác pointer bắt đầu trong nội dung modal để chọn hoặc kéo văn bản, kể cả khi thao tác đó kết thúc trên backdrop.

#### Scenario: Select the member name and release on the backdrop
- **WHEN** người dùng bắt đầu kéo trong ô tên ingame để bôi đen văn bản và thả pointer trên backdrop
- **THEN** modal chi tiết thành viên MUST vẫn mở
- **THEN** giá trị đang chỉnh sửa trong ô tên MUST được giữ nguyên

#### Scenario: Drag starts from another control inside the dialog
- **WHEN** người dùng bắt đầu một thao tác pointer trên một control trong modal và kết thúc trên backdrop
- **THEN** modal chi tiết thành viên MUST không gọi hành động đóng backdrop chỉ vì thao tác đó

### Requirement: Member detail modal supports intentional backdrop dismissal
Modal chi tiết thành viên MUST đóng khi người dùng thực hiện click hoặc tap trực tiếp trên backdrop bằng một thao tác pointer bắt đầu trên backdrop.

#### Scenario: Click the backdrop directly
- **WHEN** người dùng nhấn và thả pointer trực tiếp trên backdrop, bên ngoài vùng hội thoại
- **THEN** modal chi tiết thành viên MUST đóng

#### Scenario: Use another explicit close path
- **WHEN** người dùng nhấn nút đóng hoặc lưu thành công thay đổi hợp lệ
- **THEN** modal chi tiết thành viên MUST tiếp tục đóng theo hành vi hiện có
