## MODIFIED Requirements

### Requirement: Discord attendance summary presents core vote counts
Hệ thống SHALL hiển thị phần tóm tắt trong thông điệp điểm danh Discord với tổng số vote, số người tham gia, số người dự bị và số người không tham gia. Nhãn tổng số vote SHALL bắt đầu bằng biểu tượng `🗳️`.

#### Scenario: Summary with recorded votes
- **WHEN** một thông điệp điểm danh Discord được render cho session có ít nhất một vote
- **THEN** phần summary SHALL hiển thị `🗳️ Tổng vote: <count>`, `✅ Tham gia: <count>`, `🛡️ Dự bị: <count>` và `❌ Không tham gia: <count>` với các số lượng tương ứng
- **THEN** `Tổng vote` MUST bằng tổng số vote `GO`, `RESERVE` và `NOGO`
- **THEN** `Dự bị` MUST NOT được cộng vào `Tham gia`

#### Scenario: Summary without recorded votes
- **WHEN** một thông điệp điểm danh Discord được render cho session chưa có vote
- **THEN** phần summary SHALL hiển thị `🗳️ Tổng vote: 0`, `✅ Tham gia: 0`, `🛡️ Dự bị: 0` và `❌ Không tham gia: 0`

### Requirement: Discord attendance summary omits class aggregation
Hệ thống SHALL NOT hiển thị dòng `Theo phái` hoặc bất kỳ thống kê tổng hợp theo phái nào trong phần summary của thông điệp điểm danh Discord.

#### Scenario: Votes span one or more classes
- **WHEN** một thông điệp điểm danh Discord được render cho session có vote thuộc một hoặc nhiều phái
- **THEN** phần summary SHALL NOT chứa nhãn `Theo phái` hay danh sách số lượng theo phái
- **THEN** danh sách người tham gia SHALL tiếp tục được nhóm theo phái, danh sách dự bị SHALL hiển thị người dự bị và phái của họ, và danh sách không tham gia SHALL tiếp tục hiển thị phái của từng người

#### Scenario: No votes have been submitted
- **WHEN** một thông điệp điểm danh Discord được render cho session chưa có vote
- **THEN** phần summary SHALL NOT chứa trạng thái thay thế `Theo phái: (chưa có)`

## ADDED Requirements

### Requirement: Discord attendance message offers a reserve response
Hệ thống SHALL cung cấp lựa chọn `Dự bị` trên Discord attendance message cho cả session `GVG` và `SCRIM`.

#### Scenario: Member changes an existing response to reserve
- **WHEN** thành viên active đã vote `GO` hoặc `NOGO` chọn nút `Dự bị` của cùng session đang mở
- **THEN** hệ thống MUST thay thế vote trước đó bằng `RESERVE`
- **THEN** hệ thống MUST render lại summary và danh sách Discord để phản ánh vote mới nhất

#### Scenario: Member changes reserve to another response
- **WHEN** thành viên active có vote `RESERVE` chọn `Tham gia` hoặc `Không tham gia` của cùng session đang mở
- **THEN** hệ thống MUST thay thế `RESERVE` bằng lựa chọn mới
- **THEN** session MUST tiếp tục chỉ có một vote của thành viên đó