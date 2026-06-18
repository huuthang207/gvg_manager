## ADDED Requirements

### Requirement: Attendance history details modal summarizes response status before detailed lists
Hệ thống MUST hiển thị modal chi tiết lịch sử điểm danh theo thứ bậc thông tin ưu tiên summary trạng thái phản hồi trước khi hiển thị cơ cấu phái hoặc danh sách chi tiết.

#### Scenario: User opens a closed attendance session from history
- **WHEN** người dùng mở chi tiết một phiên điểm danh đã đóng
- **THEN** modal MUST hiển thị summary cho số lượng `GO`, `NOGO`, thành viên active chưa điểm danh và tổng số thành viên active của phiên
- **THEN** modal MUST hiển thị tiến độ phản hồi dựa trên tổng người đã vote và tổng thành viên active
- **THEN** summary này MUST xuất hiện trước các khu vực danh sách chi tiết

### Requirement: Attendance history details modal separates reviewed and unreviewed member groups
Hệ thống MUST trình bày rõ ràng hai nhóm thành viên đã phản hồi và chưa phản hồi để người quản lý bang review nhanh một phiên attendance đã đóng.

#### Scenario: Modal renders member detail sections
- **WHEN** modal chi tiết lịch sử điểm danh render nội dung thành viên
- **THEN** hệ thống MUST hiển thị khu vực danh sách người đã điểm danh tách biệt với khu vực người chưa điểm danh
- **THEN** mỗi khu vực MUST hiển thị số lượng thành viên tương ứng
- **THEN** người dùng MUST có thể phân biệt hai nhóm này mà không cần đọc toàn bộ danh sách vote

### Requirement: Attendance history details modal provides scan-friendly filtering and vote presentation
Hệ thống MUST giữ khả năng tìm kiếm/lọc vote và MUST trình bày danh sách vote theo cách dễ quét mắt hơn trong modal lịch sử.

#### Scenario: User filters attendance votes in history details
- **WHEN** người dùng nhập từ khóa tìm kiếm hoặc đổi filter theo choice hay class
- **THEN** hệ thống MUST chỉ cập nhật danh sách vote phù hợp với bộ lọc
- **THEN** toolbar lọc MUST xuất hiện gần khu vực danh sách vote để người dùng hiểu đây là bộ lọc của phần chi tiết

#### Scenario: Vote items render in the redesigned history details modal
- **WHEN** hệ thống render danh sách vote trong modal lịch sử
- **THEN** mỗi item hoặc row MUST hiển thị tối thiểu tên thành viên, class, trạng thái phản hồi và thời điểm cập nhật gần nhất
- **THEN** danh sách MUST ưu tiên khả năng quét nhanh theo chiều dọc thay vì phụ thuộc hoàn toàn vào bố cục bảng nặng
