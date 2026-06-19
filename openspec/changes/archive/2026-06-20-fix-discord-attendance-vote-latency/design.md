## Context

Luồng vote attendance trên Discord hiện đi qua `backend/src/botAttendance.ts`, `backend/src/services/attendanceService.ts`, và `backend/src/services/attendanceDiscordService.ts`. Khi người dùng bấm nút vote, bot `deferReply`, ghi vote, load lại full session kèm toàn bộ votes/member data, rồi mới `editReply`. Sau đó hệ thống còn refresh Discord attendance message và publish `attendance_updated`, khiến frontend `frontend/src/features/app/useGuildRealtime.ts` refetch toàn bộ app state từ `backend/src/appState.ts`.

Cấu trúc này hoạt động đúng khi tải thấp, nhưng dưới burst voting nó tạo ra ba nguồn contention chính:
- hot path của interaction phải đợi query/service nặng hơn mức cần thiết,
- nhiều vote liên tiếp tạo refresh storm trên cùng Discord message,
- mỗi attendance update fan out thành nhiều full app-state refresh không cần thiết.

Thiết kế cần sửa triệt để nhưng ưu tiên thay đổi ít rủi ro, không phá behavior attendance hiện tại và tái sử dụng các pattern đã có trong codebase như `replyServiceError(...)` và queue/dedupe của `backend/src/services/syncService.ts`.

## Goals / Non-Goals

**Goals:**
- Giảm rõ rệt thời gian từ lúc Discord button interaction được nhận đến lúc bot trả ephemeral confirmation.
- Giảm số lần load full attendance session và giảm write contention trên cùng `AttendanceSession` row trong vote path.
- Coalesce refresh của Discord attendance message theo từng session để tránh nhiều `message.edit()` liên tiếp cho cùng một burst vote.
- Giảm số lần full app-state refresh do `attendance_updated` event burst ở frontend realtime layer.
- Thêm observability và test coverage đủ để xác minh root cause và chứng minh hiệu quả sau fix.

**Non-Goals:**
- Không thay đổi user-facing attendance choices hoặc semantics của `GO` / `NOGO`.
- Không đổi giao thức WebSocket tổng thể hoặc tách attendance sang một realtime protocol mới ở bước đầu.
- Không thay đổi data model lớn hoặc thêm external queue/dependency mới cho phase fix đầu tiên.

## Decisions

### 1. Tách lightweight vote mutation khỏi full session hydration
Bot button path sẽ không tiếp tục dùng service shape trả về full serialized session với `votes.include.member` trên mọi vote. Thay vào đó, `attendanceService` sẽ có một lightweight mutation helper chỉ:
- validate guild/session/member,
- `attendanceVote.upsert(...)`,
- touch session metadata ở mức tối thiểu,
- trả về refresh target tối thiểu (`sessionId`, `guildId`, `discordChannelId`, `discordMessageId`).

**Rationale:**
- Đây là cách giảm latency hiệu quả nhất mà vẫn giữ nguyên semantics nghiệp vụ.
- Bot chỉ cần biết vote có thành công không và refresh session nào; nó không cần hydrate full vote list trước khi `editReply`.
- Cách này cũng cho phép giữ API/HTTP flow hiện có trong khi tối ưu riêng hot path của Discord button.

**Alternative considered:**
- Dùng luôn `castAttendanceVote(...)` hiện tại và chỉ thêm logging. Cách này giúp quan sát nhưng không giải quyết bản chất của synchronous hot path.

### 2. Thêm per-session refresh coordinator cho Discord attendance message
`attendanceDiscordService.ts` sẽ có một coordinator nội bộ theo `sessionId`, dùng pattern tương tự `syncService.ts`: chỉ một refresh chạy tại một thời điểm cho mỗi session; request mới trong lúc đang chạy sẽ được mark pending; burst vote sẽ được debounce/coalesce thành một số ít lần refresh thực tế.

**Rationale:**
- Giảm mạnh số lần `getAttendanceRenderPayload(...)`, `channel.messages.fetch(...)`, `message.edit(...)`, và `markAttendanceRendered(...)` khi nhiều người vote gần nhau.
- Giảm rủi ro stale/out-of-order public message edits.
- Tái sử dụng pattern queue/dedupe đã quen thuộc trong codebase.

**Alternative considered:**
- Đưa refresh sang external job queue. Điều này mạnh hơn nhưng tăng độ phức tạp triển khai và vận hành không cần thiết cho fix đầu tiên.

### 3. Vote paths enqueue refresh thay vì chờ refresh hoàn tất
Discord button vote path và web attendance vote route sẽ enqueue refresh thay vì chờ `editAttendanceDiscordMessage(...)` hoàn tất trước khi response kết thúc. Admin open/close/manual refresh flows có thể tiếp tục chờ trực tiếp để giữ UX điều khiển rõ ràng.

**Rationale:**
- Vote là luồng tần suất cao, cần ưu tiên acknowledge nhanh.
- Open/close/manual refresh là thao tác quản trị tần suất thấp, có thể giữ synchronous behavior hiện tại nếu cần.

**Alternative considered:**
- Chuyển toàn bộ open/close/refresh sang async queue ngay. Điều này đồng nhất hơn nhưng có thể làm UX quản trị khó đoán hơn mà chưa mang lại giá trị tương xứng.

### 4. Coalesce attendance-triggered app-state refresh ở frontend trước khi đổi protocol
Trong `frontend/src/features/app/useGuildRealtime.ts`, `attendance_updated` events sẽ được debounce/coalesce: nếu đang có app-state refresh in-flight thì không mở thêm request mới; nếu nhiều event đến trong lúc đang refresh thì chỉ schedule đúng một lần follow-up.

**Rationale:**
- Giữ nguyên contract realtime hiện tại nên rủi ro thấp.
- Giảm fan-out load nhanh mà không cần đổi shape API/state ở cùng đợt.
- Có thể đo hiệu quả trước khi cân nhắc tách attendance sang targeted realtime payload sau này.

**Alternative considered:**
- Tạo event/payload riêng cho attendance và không gọi `getAppState()` nữa. Đây là hướng dài hạn tốt hơn nhưng phạm vi thay đổi rộng hơn, không phù hợp cho bước fix đầu tiên.

### 5. Thêm observability theo từng lớp và gate bằng env flag
Sẽ thêm timing/logging cho interaction path, attendance service hot path, refresh coordinator, và frontend realtime coalescing, theo phong cách gating tương tự `DISCORD_REALTIME_DEBUG`.

**Rationale:**
- Cần dữ liệu before/after để xác nhận bottleneck thật sự nằm ở DB hot path, refresh storm, hay app-state fan-out.
- Giúp manual verification và post-deploy debugging mà không phải bật log ồn mặc định.

## Risks / Trade-offs

- **[Risk] Queue/coalesce refresh làm public attendance message cập nhật chậm hơn vài trăm ms** → **Mitigation:** dùng debounce ngắn, ưu tiên giảm storm nhưng vẫn giữ cảm giác gần realtime.
- **[Risk] Tách lightweight vote helper khỏi service cũ tạo duplication logic nếu thiết kế không cẩn thận** → **Mitigation:** trích shared validation/mutation helpers rõ ràng để web và bot reuse cùng business rules.
- **[Risk] Frontend coalescing có thể làm dashboard nhận state muộn hơn trong burst** → **Mitigation:** chỉ debounce `attendance_updated`, không ảnh hưởng event loại khác; dùng follow-up refresh nếu event đến trong lúc request đang chạy.
- **[Risk] Logging quá nhiều làm khó đọc log production** → **Mitigation:** gate bằng env flag riêng, log theo session/interaction identifiers và chỉ bật khi cần điều tra.
