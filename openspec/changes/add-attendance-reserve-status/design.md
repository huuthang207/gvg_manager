## Context

Attendance hiện dùng Prisma enum `AttendanceChoice` với `GO` và `NOGO`. Giá trị này đi qua persistence `AttendanceVote` và `AttendanceVoteJob`, API validation, Discord custom ID/buttons, queue, serializer, realtime app state và các view React. Do hai loại `GVG` và `SCRIM` dùng chung model và luồng vote, trạng thái mới phải được thêm xuyên suốt thay vì tạo một nhánh xử lý riêng cho Scrim.

Người quản lý cần biết ai có thể thay thế nếu thiếu người, nhưng nhóm này không phải người đã cam kết tham gia. Quy tắc đã thống nhất là `Dự bị` là phản hồi độc lập, không cộng vào `GO`; thao tác chọn phản hồi mới vẫn ghi đè vote cũ của cùng thành viên trong cùng phiên.

## Goals / Non-Goals

**Goals:**

- Bổ sung một giá trị enum chung `RESERVE` để biểu thị `Dự bị` cho cả `GVG` và `SCRIM`.
- Cho phép chọn, persist, queue, render Discord, đồng bộ realtime và review `RESERVE` như một vote hợp lệ.
- Hiển thị count, badge, filter và danh sách riêng cho `RESERVE`, trong khi `GO` và `NOGO` giữ ý nghĩa hiện có.
- Bảo toàn các integration chỉ nhận `GO`: GvG participation finalization và attendance-backed lineup roster.
- Giữ compatibility cho dữ liệu lịch sử `GO`/`NOGO` hiện có.

**Non-Goals:**

- Không tự động thêm người `RESERVE` vào danh sách chốt tham gia thực tế Bang Chiến hoặc lineup slots.
- Không thêm thứ tự ưu tiên, quota, deadline, hay cơ chế tự động nâng `Dự bị` thành `Tham gia`.
- Không thay đổi quyền, session lifecycle, cấu hình kênh, hoặc schema tách riêng cho Scrim.
- Không backfill hay thay đổi vote lịch sử hiện có.

## Decisions

### 1. Dùng enum `RESERVE` dùng chung cho mọi attendance type

`AttendanceChoice` sẽ được mở rộng từ `GO | NOGO` thành `GO | RESERVE | NOGO`; UI hiển thị nhãn tiếng Việt `Dự bị`.

**Rationale:** Vote model, Discord interaction và frontend type đang được dùng chung cho `GVG`/`SCRIM`. Một enum value duy nhất đảm bảo API, serializer và realtime state đồng nhất, đồng thời cho phép mỗi thành viên upsert một lựa chọn mới nhất như hiện tại.

**Alternatives considered:**
- Dùng một boolean `isReserve` bên cạnh `GO`: loại bỏ tính loại trừ lẫn nhau giữa các lựa chọn và làm phức tạp unique vote hiện có.
- Chỉ hỗ trợ `RESERVE` cho `SCRIM`: không đáp ứng yêu cầu hỗ trợ cả hai loại và tạo UI/Discord behavior không nhất quán.

### 2. Coi `RESERVE` là nhóm độc lập trong mọi aggregate

Summary sẽ có trường `reserve` riêng; tổng số vote là `go + reserve + nogo`. `RESERVE` không được cộng vào `go`, “Tham gia”, hay các query/logic eligibility đang yêu cầu rõ `GO`.

**Rationale:** Quản lý cần quan sát mức sẵn sàng thay thế mà không làm sai số người đã xác nhận tham gia. Mô hình này cũng giữ nguyên behavior của các consumer chỉ hiểu `GO` là đủ điều kiện.

**Alternatives considered:**
- Cộng `RESERVE` vào `GO`: gây sai lệch số người tham gia chính thức và phá vỡ quy ước lineup/participation hiện có.
- Không lưu count `reserve` trong API: frontend và Discord sẽ phải tự đếm từ danh sách vote, tạo nhiều aggregate không đồng nhất.

### 3. Discord render đủ ba lựa chọn và ba nhóm hiển thị

Discord component sẽ render ba button custom ID theo cùng format hiện có, với choice `GO`, `RESERVE`, `NOGO`. Nội dung public gồm tổng vote, ba count, danh sách tham gia (có thể nhóm theo phái), danh sách dự bị và danh sách không tham gia.

**Rationale:** Thành viên cần có khả năng chọn trực tiếp trên Discord, nơi attendance được vận hành; manager cần thấy nhóm dự bị công khai và tách biệt.

**Alternatives considered:**
- Chỉ thêm button nhưng không render danh sách: không đáp ứng nhu cầu review nhóm dự bị trực tiếp trên message.
- Quản lý `Dự bị` chỉ từ web: không phù hợp với flow vote hiện tại và thêm manual work cho manager.

### 4. Frontend mở rộng mọi UI state-derived từ choice, còn integration GO-only giữ nguyên

`AttendanceView` sẽ thêm metadata/badge, metric card, active/history summary và `ReviewStatus` filter cho `RESERVE`; những type guard chỉ được cập nhật để coi đây là choice hiện tại. `GvgParticipationModal` tiếp tục filter chính xác `choice === 'GO'`; attendance-backed lineup tiếp tục dùng exact `GO` eligibility.

**Rationale:** `RESERVE` phải là dữ liệu first-class khi quan sát attendance, nhưng không được chuyển thành attendance xác nhận tại nơi lựa chọn đội hình hoặc chốt tham gia.

**Alternatives considered:**
- Dùng predicate “không phải NOGO” cho integration: vô tình coi dự bị là tham gia và trái với business rule đã thống nhất.

## Risks / Trade-offs

- [Prisma enum migration cần được áp dụng trước khi backend mới ghi `RESERVE`] → Tạo migration additive, deploy migration trước hoặc cùng artifact backend; rollback application trước khi rollback schema vì enum mới không làm dữ liệu cũ không đọc được.
- [Một số exhaustive switch/type guard/test chỉ biết hai choice] → Search toàn repository theo `GO`/`NOGO` và `AttendanceChoice`, type-check frontend/backend, cập nhật unit test render, button parser và vote persistence.
- [Message Discord cũ có hai components cho đến khi refresh] → Refresh theo cơ chế sẵn có sẽ thay message components; phiên mới luôn dùng ba nút. Không cần mutate hay backfill vote cũ.
- [Summary consumer có thể giả định `go + nogo` là tổng] → Serializer/API types và mọi UI summary được cập nhật cùng change; những integration GO-only vẫn dùng exact equality.

## Migration Plan

1. Thêm migration Prisma mở rộng PostgreSQL enum `AttendanceChoice` bằng `RESERVE`, cập nhật Prisma schema và generate client.
2. Cập nhật backend validation, button parsing, component rendering, serialization/aggregate, queue typing và tests.
3. Cập nhật shared frontend API types và attendance UI, đồng thời giữ GvG finalization và lineup eligibility filter `GO`-only.
4. Build/type-check frontend và backend; chạy backend test suite, đặc biệt attendance renderer, Discord service/bot, serializers và attendance service/queue tests.
5. Deploy migration trước khi hoặc cùng backend/frontend. Refresh các active attendance session để message Discord cũ nhận button `Dự bị`.

**Rollback:** Roll back frontend/backend code để ngừng tạo vote mới `RESERVE`. Nếu database đã chứa `RESERVE`, không rollback enum ngay vì PostgreSQL enum value removal cần migration phức tạp và có thể làm mất dữ liệu; giữ enum additive cho đến khi dữ liệu được xử lý theo một change riêng.

## Open Questions

- Không có; phạm vi và semantics của `Dự bị` đã được xác nhận.