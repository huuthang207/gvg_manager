## ADDED Requirements

### Requirement: Scrim attendance has an independent channel and session scope
Hệ thống SHALL hỗ trợ attendance type `SCRIM` độc lập với Bang Chiến, trong đó mỗi guild có thể cấu hình kênh Discord riêng và duy trì tối đa một phiên Scrim đang mở.

#### Scenario: Manager configures Scrim channel
- **WHEN** người có quyền `manage:attendance` lưu Discord channel hợp lệ cho Scrim
- **THEN** hệ thống MUST lưu channel đó trong cấu hình `SCRIM` của guild
- **THEN** hệ thống MUST NOT thay đổi cấu hình channel Bang Chiến hiện có

#### Scenario: Manager opens Scrim while GvG is open
- **WHEN** guild đã có một phiên Bang Chiến đang mở và manager mở phiên Scrim
- **THEN** hệ thống MUST tạo phiên Scrim nếu đã cấu hình channel Scrim
- **THEN** hệ thống MUST giữ phiên Bang Chiến đang mở không thay đổi

#### Scenario: Manager opens duplicate Scrim
- **WHEN** guild đã có một phiên Scrim đang mở và manager cố mở thêm phiên Scrim
- **THEN** hệ thống MUST từ chối yêu cầu
- **THEN** hệ thống MUST không ảnh hưởng đến phiên Scrim đang mở hoặc phiên Bang Chiến

### Requirement: Scrim attendance records and renders standard attendance votes
Phiên Scrim SHALL dùng các lựa chọn `GO` và `NOGO`, snapshot thành viên, và cập nhật realtime giống attendance Bang Chiến.

#### Scenario: Member votes on a Scrim Discord message
- **WHEN** thành viên active chọn `Tham gia` hoặc `Không tham gia` trên message điểm danh Scrim đang mở
- **THEN** hệ thống MUST ghi hoặc cập nhật vote trong phiên Scrim đó
- **THEN** hệ thống MUST lưu snapshot tên ingame và phái tại thời điểm vote
- **THEN** hệ thống MUST cập nhật message Discord và app state realtime cho guild

#### Scenario: System renders Scrim attendance message
- **WHEN** hệ thống gửi hoặc refresh message cho phiên Scrim
- **THEN** nội dung message MUST nhận diện rõ đây là điểm danh Scrim
- **THEN** message MUST chỉ chứa các nút `Tham gia` và `Không tham gia`

### Requirement: Scrim attendance has separate operational controls and history
Hệ thống SHALL cung cấp open, close, refresh, detail và history cho Scrim mà không trộn dữ liệu session với Bang Chiến.

#### Scenario: Manager views Scrim attendance history
- **WHEN** người dùng chọn Scrim trong attendance workspace
- **THEN** hệ thống MUST hiển thị active session và lịch sử chỉ thuộc type `SCRIM`
- **THEN** session Bang Chiến MUST NOT xuất hiện trong danh sách hoặc chi tiết Scrim

#### Scenario: Manager uses Scrim Discord command
- **WHEN** manager dùng `/diemdanhscrim open`, `/diemdanhscrim close` hoặc `/diemdanhscrim refresh`
- **THEN** hệ thống MUST thực hiện thao tác tương ứng trên phiên `SCRIM` của guild
- **THEN** phản hồi Discord MUST nhận diện thao tác là điểm danh Scrim
