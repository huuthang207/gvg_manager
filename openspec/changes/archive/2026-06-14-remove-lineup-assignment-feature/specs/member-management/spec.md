## MODIFIED Requirements

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

### Requirement: Class-change acknowledge API is removed from member management flow
Hệ thống MUST không còn cung cấp hoặc gọi flow acknowledge trạng thái đổi phái vì trạng thái này không còn tồn tại.

#### Scenario: Frontend member management actions
- **WHEN** frontend quản lý member actions
- **THEN** frontend MUST NOT gọi `acknowledgeClassChange`
- **THEN** frontend MUST NOT phụ thuộc endpoint `/api/members/:memberId/class-change/ack`

#### Scenario: Backend member routes
- **WHEN** backend đăng ký member routes
- **THEN** backend MUST NOT expose endpoint acknowledge class change
