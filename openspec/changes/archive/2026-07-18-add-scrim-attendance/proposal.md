## Why

Bang cần xác nhận người tham gia Scrim bằng cùng trải nghiệm Discord realtime đang dùng cho Bang Chiến, nhưng kênh, phiên đang mở và lịch sử Scrim không được lẫn với vận hành Bang Chiến. Hiện attendance chỉ có một cấu hình và một phiên mở trên toàn guild nên không thể vận hành hai loại điểm danh độc lập.

## What Changes

- Thêm loại attendance `SCRIM` bên cạnh loại Bang Chiến hiện có; mỗi loại có cấu hình Discord channel, phiên mở và lịch sử riêng.
- Cho phép một phiên Bang Chiến và một phiên Scrim mở đồng thời, nhưng chỉ một phiên mở cho mỗi loại trong một guild.
- Thêm tab/switcher Bang Chiến và Scrim vào workspace attendance; tab Scrim tái sử dụng luồng mở, đóng, refresh, chi tiết, review và lịch sử hiện có.
- Bổ sung lệnh Discord `/diemdanhscrim` với các subcommand `open`, `close`, và `refresh`; message và phản hồi phải nhận diện rõ đây là điểm danh Scrim.
- Giữ các vote `GO`/`NOGO`, snapshot thành viên, realtime update và quyền `manage:attendance` hiện có.
- Không thêm roster Scrim, đối thủ, kết quả trận hoặc tính năng chốt đội vào MVP.

## Capabilities

### New Capabilities
- `scrim-attendance`: Quy định attendance Scrim độc lập gồm kênh Discord riêng, lifecycle phiên, vote, lịch sử và điều khiển Discord.

### Modified Capabilities
- `attendance-lineup-simplification`: Mở rộng attendance từ một luồng đơn thành các loại phiên độc lập, đồng thời vẫn giữ flow chỉ có `GO` và `NOGO`.

## Impact

- Backend: Prisma schema/migration, attendance service, route handlers, app-state serialization, Discord rendering/button parsing và Discord slash command registration.
- Frontend: shared attendance API/types, app-state handling và attendance workspace để chuyển giữa Bang Chiến/Scrim.
- Không thay đổi quyền, database member, Discord OAuth, hay thêm dependency mới.
