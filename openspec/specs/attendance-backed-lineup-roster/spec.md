## Purpose

Quy định việc dùng một phiên điểm danh GvG hoặc Scrim làm nguồn roster cho workspace Bang Chiến.

## Requirements

### Requirement: Owner can select an attendance session as lineup roster source
Hệ thống SHALL cho guild owner chọn nguồn roster của GvG lineup là `Tất cả thành viên` hoặc một AttendanceSession GvG/Scrim thuộc cùng guild. Hệ thống MUST persist nguồn đã chọn trong lineup và trả nguồn đó trong canonical lineup response.

#### Scenario: Owner selects a GvG attendance session
- **WHEN** guild owner chọn một AttendanceSession type `GVG` thuộc guild làm nguồn roster
- **THEN** hệ thống MUST lưu ID session đó trên GvG lineup
- **THEN** canonical lineup response MUST gồm session source đã chọn
- **THEN** hệ thống MUST publish `gvg_lineup_updated`

#### Scenario: Owner selects a Scrim attendance session
- **WHEN** guild owner chọn một AttendanceSession type `SCRIM` thuộc guild làm nguồn roster
- **THEN** hệ thống MUST lưu ID session đó trên GvG lineup
- **THEN** candidate eligibility MUST dùng vote của session Scrim đã chọn

#### Scenario: Owner resets to all members
- **WHEN** guild owner chọn nguồn `Tất cả thành viên`
- **THEN** hệ thống MUST xóa roster session source của lineup
- **THEN** assignment mới MUST tiếp tục dùng rule active và không trùng squad hiện có

#### Scenario: Owner selects a session from another guild
- **WHEN** guild owner cố chọn AttendanceSession không thuộc active guild
- **THEN** hệ thống MUST từ chối mutation
- **THEN** hệ thống MUST giữ nguyên lineup source và assignment hiện có

### Requirement: Attendance-backed source limits new lineup assignments
Khi GvG lineup có roster session source, hệ thống SHALL chỉ cho phép gán mới member active có AttendanceVote `GO` trong đúng session đó. Backend MUST enforce rule cho mọi mutation squad slot.

#### Scenario: Owner assigns a GO voter
- **WHEN** owner thêm một member active có vote `GO` trong roster source session vào một slot trống
- **THEN** backend MUST persist assignment nếu các lineup constraints khác hợp lệ

#### Scenario: Owner assigns a non-voter or NOGO voter
- **WHEN** owner hoặc API client cố thêm member không có vote `GO` trong roster source session
- **THEN** backend MUST từ chối mutation
- **THEN** hệ thống MUST không thay đổi squad slots

#### Scenario: No roster session source is selected
- **WHEN** lineup source là `Tất cả thành viên`
- **THEN** backend MUST không yêu cầu attendance vote
- **THEN** backend MUST tiếp tục chỉ chấp nhận member active, thuộc guild, và không thuộc squad khác

### Requirement: Existing assignments remain stable across attendance changes
Hệ thống SHALL giữ assignment đã tồn tại khi member đổi vote hoặc owner đổi nguồn roster. Những member không còn có vote `GO` theo source hiện tại MUST không được dùng cho assignment mới và MUST được nhận diện trong lineup UI.

#### Scenario: Assigned member changes from GO to NOGO
- **WHEN** một member đã được gán trong squad đổi vote từ `GO` sang `NOGO`
- **THEN** hệ thống MUST không tự động gỡ assignment đó
- **THEN** lineup UI MUST hiển thị trạng thái cảnh báo cho assignment không còn eligible
- **THEN** member đó MUST không xuất hiện như candidate cho slot khác

#### Scenario: Owner replaces a warned member
- **WHEN** owner thay một assignment không còn eligible bằng member khác
- **THEN** backend MUST validate member mới theo roster source hiện tại
- **THEN** backend MUST persist replacement chỉ khi member mới có vote `GO`
