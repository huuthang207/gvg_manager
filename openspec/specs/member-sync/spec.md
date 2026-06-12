## Purpose

Quy định behavior đồng bộ thành viên từ Discord sau khi loại bỏ class-change tracking. `classType` là trạng thái phái hiện tại duy nhất được lưu và trả về cho member.

## Requirements

### Requirement: Member sync updates only current class state
Hệ thống MUST đồng bộ phái hiện tại của thành viên vào `classType` theo Discord role mapping mới nhất mà không tạo, lưu, hoặc trả về trạng thái lịch sử đổi phái.

#### Scenario: Synced member class changes
- **WHEN** một thành viên đã tồn tại được đồng bộ và role mapping mới resolve sang phái khác với `classType` hiện tại
- **THEN** hệ thống MUST cập nhật `classType` sang phái mới
- **THEN** hệ thống MUST NOT lưu `previousClassType` hoặc `classChangedAt`

#### Scenario: Synced member class remains unchanged
- **WHEN** một thành viên đã tồn tại được đồng bộ và role mapping resolve cùng phái với `classType` hiện tại
- **THEN** hệ thống MUST giữ `classType` hiện tại
- **THEN** hệ thống MUST NOT tạo trạng thái đổi phái cần xử lý

### Requirement: Member sync response excludes class-change tracking fields
API/state response sau đồng bộ thành viên MUST không bao gồm các field phục vụ class-change tracking.

#### Scenario: Serialized synced member response
- **WHEN** frontend nhận danh sách thành viên sau khi đồng bộ
- **THEN** mỗi member MUST bao gồm `classType` hiện tại
- **THEN** mỗi member MUST NOT bao gồm `previousClassType` hoặc `classChangedAt`
