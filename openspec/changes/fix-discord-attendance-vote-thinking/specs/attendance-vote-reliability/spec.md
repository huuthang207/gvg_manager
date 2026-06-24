## MODIFIED Requirements

### Requirement: Discord attendance vote confirms promptly under burst load
Hệ thống SHALL acknowledge Discord attendance button vote bằng component interaction acknowledgement nhanh nhất khả dụng sau khi request hợp lệ được nhận, và SHALL NOT chờ full attendance session hydration, public message refresh, hoặc user feedback follow-up trước khi dập trạng thái thinking/spinner trên Discord.

#### Scenario: User votes while session is open
- **WHEN** người dùng bấm nút `Tham gia` hoặc `Không tham gia` trong một attendance session đang mở
- **THEN** hệ thống SHALL acknowledge button interaction ngay khi có thể để giảm thời gian spinner/thinking trên Discord
- **THEN** hệ thống SHALL persist vote hợp lệ của người dùng sau khi interaction đã được acknowledge thành công
- **THEN** hệ thống SHALL schedule public attendance message refresh độc lập với bước feedback cá nhân cho người dùng

#### Scenario: Public message refresh fails after vote persistence
- **WHEN** vote đã được ghi nhận thành công nhưng Discord public message refresh gặp lỗi
- **THEN** hệ thống SHALL vẫn coi interaction vote là đã được acknowledge thành công
- **THEN** hệ thống SHALL xử lý lỗi refresh như background failure thay vì làm interaction vote thất bại

#### Scenario: User feedback follow-up fails after acknowledge
- **WHEN** interaction đã được acknowledge thành công và vote đã được persist nhưng bước gửi feedback follow-up cho người dùng gặp lỗi
- **THEN** hệ thống SHALL vẫn giữ vote đã ghi nhận thành công
- **THEN** hệ thống SHALL vẫn giữ refresh request đã được queue cho attendance session đó

#### Scenario: Interaction acknowledge fails because interaction is no longer valid
- **WHEN** Discord trả về lỗi `Unknown interaction` hoặc lỗi tương đương trước khi button interaction được acknowledge thành công
- **THEN** hệ thống SHALL dừng xử lý vote path đó
- **THEN** hệ thống SHALL NOT persist vote cho interaction không còn hợp lệ đó

### Requirement: Attendance vote path exposes debug timings when enabled
Hệ thống SHALL cung cấp timing/coordination debug logs cho attendance vote path và refresh path khi debug flag tương ứng được bật, bao gồm đủ metadata để phân biệt interaction acknowledge latency, vote persistence latency, refresh queue behavior, và follow-up feedback failures.

#### Scenario: Attendance vote debug mode is enabled
- **WHEN** môi trường chạy bật debug flag cho attendance vote reliability
- **THEN** hệ thống SHALL log ít nhất các mốc thời gian của interaction acknowledge, vote persistence, refresh queue/coalescing, public message refresh result, và follow-up feedback result
- **THEN** mỗi log record SHALL chứa đủ identifier để correlate theo attendance session hoặc interaction

#### Scenario: Acknowledge path is slower than expected
- **WHEN** interaction acknowledge mất nhiều thời gian hơn bình thường hoặc thất bại
- **THEN** hệ thống SHALL log metadata đủ để xác định loại acknowledge đang dùng, thời gian acknowledge, và bot instance xử lý interaction đó
- **THEN** hệ thống SHALL log Discord error code/message nếu bước acknowledge thất bại
