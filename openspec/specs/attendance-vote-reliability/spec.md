## Purpose

Quy định behavior giúp luồng vote attendance trên Discord phản hồi ổn định dưới burst traffic, đồng thời giảm refresh storm trên Discord message và các app-state refresh dư thừa do realtime updates.

## Requirements

### Requirement: Discord attendance vote confirms promptly under burst load
Hệ thống SHALL xác nhận Discord attendance button vote bằng ephemeral interaction response sau khi vote persistence tối thiểu hoàn tất, và SHALL NOT chờ full attendance session hydration hoặc public message refresh trước khi trả lời người dùng.

#### Scenario: User votes while session is open
- **WHEN** người dùng bấm nút `Tham gia` hoặc `Không tham gia` trong một attendance session đang mở
- **THEN** hệ thống SHALL persist vote hợp lệ của người dùng
- **THEN** hệ thống SHALL trả ephemeral confirmation cho interaction mà không phụ thuộc vào việc render lại public attendance message

#### Scenario: Public message refresh fails after vote persistence
- **WHEN** vote đã được ghi nhận thành công nhưng Discord public message refresh gặp lỗi
- **THEN** hệ thống SHALL vẫn trả ephemeral confirmation thành công cho người dùng
- **THEN** hệ thống SHALL xử lý lỗi refresh như background failure thay vì làm interaction vote thất bại

### Requirement: Attendance message refresh is coalesced per session
Hệ thống SHALL coalesce các yêu cầu refresh Discord attendance message theo từng attendance session để tránh refresh storm khi nhiều vote đến gần nhau.

#### Scenario: Multiple votes arrive during a burst
- **WHEN** nhiều vote hợp lệ cho cùng một attendance session đến liên tiếp trong khoảng thời gian ngắn
- **THEN** hệ thống SHALL gộp các refresh requests cho session đó thành số lần public message refresh ít hơn số vote nhận được
- **THEN** hệ thống SHALL eventually render public attendance message phản ánh vote mới nhất của burst đó

#### Scenario: Refresh already running for the same session
- **WHEN** một public attendance message refresh đang chạy cho một session và có thêm vote mới cho cùng session đó
- **THEN** hệ thống SHALL NOT chạy song song nhiều refresh workers cho cùng session
- **THEN** hệ thống SHALL schedule tối đa một follow-up refresh để áp dụng trạng thái mới nhất sau khi lần refresh hiện tại kết thúc

### Requirement: Attendance realtime updates avoid redundant app-state fetch bursts
Hệ thống SHALL coalesce attendance-triggered realtime refreshes ở client để nhiều `attendance_updated` events liên tiếp không tạo ra cùng số lượng full app-state requests.

#### Scenario: Multiple attendance updates arrive while no refresh is running
- **WHEN** client nhận nhiều `attendance_updated` events gần nhau qua realtime connection
- **THEN** client SHALL debounce hoặc coalesce các events đó thành một app-state refresh gần nhất có thể

#### Scenario: Attendance update arrives during an in-flight app-state refresh
- **WHEN** client đang chạy app-state refresh do attendance update và tiếp tục nhận thêm `attendance_updated` event
- **THEN** client SHALL NOT mở thêm request song song cho cùng mục đích refresh attendance state
- **THEN** client SHALL schedule tối đa một follow-up refresh sau khi request hiện tại hoàn tất

### Requirement: Attendance vote path exposes debug timings when enabled
Hệ thống SHALL cung cấp timing/coordination debug logs cho attendance vote path và refresh path khi debug flag tương ứng được bật.

#### Scenario: Attendance vote debug mode is enabled
- **WHEN** môi trường chạy bật debug flag cho attendance vote reliability
- **THEN** hệ thống SHALL log ít nhất các mốc thời gian của interaction acknowledge, vote persistence, refresh queue/coalescing, và public message refresh result
- **THEN** mỗi log record SHALL chứa đủ identifier để correlate theo attendance session hoặc interaction
