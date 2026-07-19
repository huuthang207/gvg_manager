## Purpose

Quy định phần tóm tắt vote của thông điệp điểm danh Discord.

## Requirements

### Requirement: Discord attendance summary presents core vote counts
Hệ thống SHALL hiển thị phần tóm tắt trong thông điệp điểm danh Discord với tổng số vote, số người tham gia và số người không tham gia. Nhãn tổng số vote SHALL bắt đầu bằng biểu tượng `🗳️`.

#### Scenario: Summary with recorded votes
- **WHEN** một thông điệp điểm danh Discord được render cho session có ít nhất một vote
- **THEN** phần summary SHALL hiển thị `🗳️ Tổng vote: <count>`, `✅ Tham gia: <count>`, và `❌ Không tham gia: <count>` với các số lượng tương ứng

#### Scenario: Summary without recorded votes
- **WHEN** một thông điệp điểm danh Discord được render cho session chưa có vote
- **THEN** phần summary SHALL hiển thị `🗳️ Tổng vote: 0`, `✅ Tham gia: 0`, và `❌ Không tham gia: 0`

### Requirement: Discord attendance summary omits class aggregation
Hệ thống SHALL NOT hiển thị dòng `Theo phái` hoặc bất kỳ thống kê tổng hợp theo phái nào trong phần summary của thông điệp điểm danh Discord.

#### Scenario: Votes span one or more classes
- **WHEN** một thông điệp điểm danh Discord được render cho session có vote thuộc một hoặc nhiều phái
- **THEN** phần summary SHALL NOT chứa nhãn `Theo phái` hay danh sách số lượng theo phái
- **THEN** danh sách người tham gia SHALL tiếp tục được nhóm theo phái và danh sách không tham gia SHALL tiếp tục hiển thị phái của từng người

#### Scenario: No votes have been submitted
- **WHEN** một thông điệp điểm danh Discord được render cho session chưa có vote
- **THEN** phần summary SHALL NOT chứa trạng thái thay thế `Theo phái: (chưa có)`
