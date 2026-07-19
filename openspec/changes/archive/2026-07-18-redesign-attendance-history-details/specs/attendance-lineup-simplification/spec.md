## MODIFIED Requirements

### Requirement: Legacy attendance data with MAYBE remains readable
Hệ thống SHALL tiếp tục đọc được attendance session cũ có vote `MAYBE`, nhưng SHALL không dùng trạng thái này để tạo reserve behavior mới và SHALL trình bày lịch sử attendance theo cấu trúc ưu tiên trạng thái phản hồi hiện hành `GO`/`NOGO` cùng nhóm chưa điểm danh.

#### Scenario: Render a legacy attendance session
- **WHEN** hệ thống đọc một attendance session cũ có vote `MAYBE`
- **THEN** hệ thống SHALL render session đó an toàn mà không làm hỏng flow hiện tại
- **THEN** hệ thống SHALL NOT tái tạo lựa chọn `MAYBE` cho vote mới từ session đó

#### Scenario: Render closed attendance history details after attendance simplification
- **WHEN** người dùng mở modal chi tiết của một attendance history session đã đóng
- **THEN** hệ thống SHALL trình bày summary và danh sách theo các trạng thái phản hồi hiện hành `GO`, `NOGO` và nhóm active members chưa điểm danh
- **THEN** hệ thống SHALL NOT tái tạo UI reserve/standby hoặc nhấn mạnh `MAYBE` như một trạng thái phản hồi mới

#### Scenario: Treat a legacy MAYBE response as unresponded
- **WHEN** một attendance session cũ có member active với vote `MAYBE` nhưng không có vote `GO` hoặc `NOGO`
- **THEN** modal lịch sử SHALL render an toàn mà không hiển thị badge, filter hoặc summary `MAYBE`
- **THEN** summary, progress, class composition và danh sách phản hồi SHALL chỉ tính các vote `GO` hoặc `NOGO`
- **THEN** member đó SHALL xuất hiện trong nhóm `Chưa phản hồi`
