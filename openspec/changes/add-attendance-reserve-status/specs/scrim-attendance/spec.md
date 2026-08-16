## MODIFIED Requirements

### Requirement: Scrim attendance records and renders standard attendance votes
Phiên Scrim SHALL dùng các lựa chọn `GO`, `RESERVE` và `NOGO`, snapshot thành viên, và cập nhật realtime giống attendance Bang Chiến.

#### Scenario: Member votes on a Scrim Discord message
- **WHEN** thành viên active chọn `Tham gia`, `Dự bị` hoặc `Không tham gia` trên message điểm danh Scrim đang mở
- **THEN** hệ thống MUST ghi hoặc cập nhật một vote duy nhất của thành viên trong phiên Scrim đó theo lựa chọn mới nhất
- **THEN** hệ thống MUST lưu snapshot tên ingame và phái tại thời điểm vote
- **THEN** hệ thống MUST cập nhật message Discord và app state realtime cho guild

#### Scenario: System renders Scrim attendance message
- **WHEN** hệ thống gửi hoặc refresh message cho phiên Scrim
- **THEN** nội dung message MUST nhận diện rõ đây là điểm danh Scrim
- **THEN** message MUST chứa các nút `Tham gia`, `Dự bị` và `Không tham gia`
- **THEN** số người `Dự bị` MUST hiển thị độc lập và MUST NOT được cộng vào `Tham gia`