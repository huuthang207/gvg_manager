## ADDED Requirements

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
