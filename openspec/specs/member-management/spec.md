## Purpose

Quy định behavior quản lý và hiển thị thành viên sau khi loại bỏ class-change tracking. UI và API không còn cảnh báo hoặc acknowledge lịch sử đổi phái.

## Requirements

### Requirement: Member UI does not show class-change alerts
Giao diện quản lý thành viên MUST không hiển thị badge, icon, tooltip, hoặc section cảnh báo lịch sử đổi phái.

#### Scenario: Member list renders a member whose class changed previously
- **WHEN** màn hình danh sách thành viên render một member
- **THEN** UI MUST hiển thị phái hiện tại từ `classType`
- **THEN** UI MUST NOT hiển thị badge `Đổi phái` hoặc tooltip `Đã đổi phái: A → B`

#### Scenario: Member detail modal renders a member
- **WHEN** modal chi tiết thành viên được mở
- **THEN** UI MUST hiển thị phái hiện tại từ `classType`
- **THEN** UI MUST NOT hiển thị section `Đã đổi phái: A → B` hoặc nút `Đã xử lý`

#### Scenario: Lineup member card renders a member
- **WHEN** member card trong lineup được render
- **THEN** UI MUST NOT hiển thị icon cảnh báo class-change tracking
- **THEN** UI MUST NOT hiển thị hoặc phụ thuộc ghi chú phân công gắn với thành viên trong lineup flow
- **THEN** UI MUST hoạt động trong mô hình chỉ có một lane thành viên, không có reserve lane

### Requirement: Class-change acknowledge API is removed from member management flow
Hệ thống MUST không còn cung cấp hoặc gọi flow acknowledge trạng thái đổi phái vì trạng thái này không còn tồn tại.

#### Scenario: Frontend member management actions
- **WHEN** frontend quản lý member actions
- **THEN** frontend MUST NOT gọi `acknowledgeClassChange`
- **THEN** frontend MUST NOT phụ thuộc endpoint `/api/members/:memberId/class-change/ack`

#### Scenario: Backend member routes
- **WHEN** backend đăng ký member routes
- **THEN** backend MUST NOT expose endpoint acknowledge class change

### Requirement: Member management excludes lineup-only skills
Hệ thống MUST không còn lưu, expose hoặc quản lý skill member khi skill chỉ phục vụ Sắp Xếp Đội Hình đã bị loại bỏ.

#### Scenario: App state serializes members
- **WHEN** backend trả app state hoặc member data
- **THEN** member payload MUST NOT chứa `assignedSkills` hoặc lineup-only skill metadata
- **THEN** app-state MUST NOT chứa danh sách `skills`

#### Scenario: Client manages a member
- **WHEN** người dùng xem, sửa, đồng bộ, soft-delete hoặc hard-delete member
- **THEN** member management MUST hoạt động độc lập với `Skill`, `MemberSkill` và skill assignment cleanup
- **THEN** UI MUST NOT hiển thị control gán, gỡ hoặc xóa skills

#### Scenario: Client calls a former member skill endpoint
- **WHEN** client gọi endpoint gán, gỡ hoặc clear member skills đã bị loại bỏ
- **THEN** backend MUST NOT expose endpoint đó
- **THEN** endpoint đó MUST NOT làm phát sinh hoặc thay đổi skill data

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
