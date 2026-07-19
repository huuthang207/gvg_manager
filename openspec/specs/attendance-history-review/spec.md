## Purpose

Quy định trải nghiệm review lịch sử điểm danh theo trạng thái phản hồi và danh sách thành viên active.

## Requirements

### Requirement: History review presents a compact response summary
Hệ thống SHALL hiển thị modal chi tiết lịch sử attendance với summary phản hồi cô đọng trước danh sách thành viên.

#### Scenario: User opens a closed attendance session
- **WHEN** người dùng mở chi tiết một phiên attendance đã đóng
- **THEN** modal MUST hiển thị tên phiên, thời điểm mở/đóng và trạng thái phiên
- **THEN** modal MUST hiển thị số `GO`, `NOGO`, thành viên active chưa phản hồi và tiến độ phản hồi trên tổng thành viên active
- **THEN** summary MUST xuất hiện trước khu vực filter và danh sách thành viên

### Requirement: History review offers status-first filtering
Hệ thống SHALL cho phép người dùng lọc review theo trạng thái phản hồi, tìm kiếm thành viên và lọc theo phái.

#### Scenario: User filters by response status
- **WHEN** người dùng chọn trạng thái `Tất cả`, `Tham gia`, `Không tham gia` hoặc `Chưa phản hồi`
- **THEN** hệ thống MUST chỉ hiển thị các thành viên khớp với trạng thái đã chọn
- **THEN** control trạng thái MUST hiển thị số lượng tương ứng cho mỗi trạng thái

#### Scenario: User searches or filters by class
- **WHEN** người dùng nhập từ khóa tên/Discord hoặc chọn phái
- **THEN** hệ thống MUST áp dụng điều kiện đó cùng với status filter hiện tại
- **THEN** hệ thống MUST hiển thị trạng thái không có kết quả khi không có thành viên phù hợp

### Requirement: History review unifies active members into one scannable list
Hệ thống SHALL trình bày thành viên active của phiên lịch sử trong một danh sách thống nhất thay vì hai panel song song đã phản hồi/chưa phản hồi.

#### Scenario: System renders member review rows
- **WHEN** modal render danh sách review của một phiên attendance
- **THEN** mỗi row MUST hiển thị tên thành viên, phái, trạng thái phản hồi và thời điểm cập nhật vote nếu có
- **THEN** thành viên active không có vote MUST hiển thị trạng thái `Chưa phản hồi` và thời điểm rỗng phù hợp
- **THEN** hệ thống MUST ưu tiên snapshot tên/phái của vote khi dữ liệu snapshot tồn tại

### Requirement: Class composition remains available as secondary detail
Hệ thống SHALL cung cấp cơ cấu phái như thông tin phụ có thể mở khi cần mà không cạnh tranh với danh sách review chính.

#### Scenario: User expands class composition
- **WHEN** người dùng chọn xem cơ cấu phái trong modal chi tiết lịch sử
- **THEN** hệ thống MUST hiển thị tổng hợp phái dựa trên các phản hồi hiện có
- **THEN** việc hiển thị cơ cấu phái MUST không làm mất trạng thái filter hoặc danh sách review hiện tại
