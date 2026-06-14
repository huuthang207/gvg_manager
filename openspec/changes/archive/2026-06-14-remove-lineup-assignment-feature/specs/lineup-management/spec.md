## ADDED Requirements

### Requirement: Lineup screen excludes assignment summary features
Màn hình lineup SHALL chỉ hỗ trợ việc hiển thị và thao tác đội hình, không bao gồm assignment summary panel hoặc assignment list panel.

#### Scenario: User opens lineup screen
- **WHEN** người dùng mở màn hình lineup
- **THEN** hệ thống SHALL NOT hiển thị khu vực `Phân công của bạn`
- **THEN** hệ thống SHALL NOT hiển thị khu vực `Danh sách phân công`

#### Scenario: User views lineup controls
- **WHEN** màn hình lineup render các action và board hiện tại
- **THEN** hệ thống SHALL tiếp tục hiển thị lineup board, team card, slot skill, snapshot actions, và lineup actions hiện có
- **THEN** hệ thống SHALL NOT cung cấp search, counter, bảng liệt kê, hoặc note input dành cho assignment summary

### Requirement: Lineup persistence excludes member note metadata
Dữ liệu lineup hiện hành và snapshot mới SHALL không bao gồm `memberNotes` trong team payload hoặc snapshot payload.

#### Scenario: System serializes lineup state
- **WHEN** backend hoặc frontend serialize dữ liệu lineup hiện hành
- **THEN** mỗi team payload SHALL chỉ bao gồm các field lineup còn được hỗ trợ
- **THEN** output SHALL NOT chứa field `memberNotes`

#### Scenario: System saves a new lineup snapshot
- **WHEN** người dùng lưu một lineup snapshot mới
- **THEN** snapshot được ghi ra SHALL NOT chứa `memberNotes`

### Requirement: Legacy snapshots with memberNotes remain restorable
Hệ thống SHALL tiếp tục đọc được snapshot cũ có chứa `memberNotes`, nhưng SHALL bỏ qua field này trong quá trình restore.

#### Scenario: Restore snapshot created before the cleanup
- **WHEN** hệ thống đọc một snapshot cũ có field `memberNotes` trong team data
- **THEN** quá trình restore SHALL hoàn tất mà không lỗi chỉ vì field này tồn tại
- **THEN** trạng thái lineup sau restore SHALL không expose hoặc sử dụng `memberNotes`
