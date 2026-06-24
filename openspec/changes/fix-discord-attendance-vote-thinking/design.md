## Context

Luồng vote attendance trên Discord hiện đã có các điểm tốt: vote được persist qua `persistAttendanceVote(...)`, public attendance message refresh được tách sang background qua `queueAttendanceDiscordMessageRefresh(...)`, và refresh path đã có debounce/coalescing theo `sessionId`. Tuy nhiên, button interaction trong `backend/src/botAttendance.ts` vẫn dùng `deferReply(...)` rồi mới `editReply(...)`, nên người dùng có thể phải nhìn trạng thái **"GvG Manager đang suy nghĩ..."** cho tới khi vote persistence và bước phản hồi tiếp theo hoàn tất.

Thay đổi này chủ yếu chạm vào Discord bot interaction handling và observability. Không có thay đổi database schema hay public HTTP API. Các stakeholder chính là người chơi vote attendance trên Discord và người vận hành backend cần log đủ rõ để chẩn đoán `Unknown interaction` (`10062`) hoặc latency bất thường.

## Goals / Non-Goals

**Goals:**
- Giảm thời gian Discord hiển thị spinner/thinking khi người dùng bấm `Tham gia` hoặc `Không tham gia`.
- Giữ nguyên vote persistence là source of truth trước khi public message phản ánh trạng thái mới.
- Không để public attendance message refresh block bước acknowledge interaction.
- Tăng khả năng truy vết bằng timing/log metadata nhất quán cho ack, persistence, queue, và feedback path.
- Bổ sung test để bảo vệ behavior mới và các failure mode quan trọng.

**Non-Goals:**
- Không thay đổi HTTP attendance vote flow từ frontend/web app.
- Không thay đổi database schema, attendance session data model, hoặc realtime protocol.
- Không viết lại cơ chế debounce/coalescing hiện có trong `attendanceDiscordService.ts` trừ khi cần enrich log context.
- Không thay đổi behavior của attendance slash commands như `open`, `close`, `refresh` ngoài phạm vi button vote interaction.

## Decisions

### 1. Dùng `deferUpdate()` cho attendance button interaction thay cho `deferReply()`
**Decision:** Button vote path sẽ acknowledge bằng `interaction.deferUpdate()` thay vì `interaction.deferReply({ flags: MessageFlags.Ephemeral })`.

**Rationale:**
- `deferUpdate()` phù hợp hơn với component interaction vì mục tiêu là dập spinner ngay trên button interaction.
- Với `deferReply()`/`editReply()`, Discord có thể tiếp tục hiển thị trạng thái thinking cho tới khi bước follow-up hoàn tất.
- Public attendance message refresh đã tách riêng khỏi interaction path, nên không cần giữ deferred reply làm phương tiện phản hồi chính.

**Alternative considered:**
- Giữ `deferReply()` và chỉ tối ưu thứ tự `editReply()`/queue refresh. Cách này cải thiện ít vì trạng thái thinking vẫn gắn với lifecycle của deferred reply.

### 2. Giữ semantics “ack thất bại thì dừng, không persist vote”
**Decision:** Nếu `deferUpdate()` fail, đặc biệt với `Unknown interaction` (`10062`), handler sẽ log đủ context rồi return sớm mà không persist vote.

**Rationale:**
- Đây là semantics đã có trong test và code hiện tại cho `deferReply()`.
- Nếu interaction không còn hợp lệ trước khi acknowledge, việc persist side effect nhưng không thể phản hồi cho người dùng làm trạng thái hệ thống khó hiểu hơn.

**Alternative considered:**
- Persist vote ngay cả khi acknowledge fail. Không chọn vì đánh đổi correctness/observability xấu hơn và khó giải thích cho người dùng.

### 3. Dùng best-effort `followUp()` cho feedback cá nhân sau khi ack thành công
**Decision:** Sau khi `deferUpdate()` thành công, handler sẽ dùng `interaction.followUp({ content, flags: MessageFlags.Ephemeral })` để gửi success/error feedback cho người dùng.

**Rationale:**
- Feedback không còn nằm trên critical path của acknowledge.
- Nếu `followUp()` fail, vote persistence và refresh queue vẫn có thể hoàn tất; handler chỉ cần log warning.
- UX vẫn giữ được thông báo cá nhân mà không kéo dài spinner.

**Alternative considered:**
- Không gửi feedback cá nhân nữa, chỉ refresh public message. Không chọn vì mất xác nhận rõ ràng cho người vừa vote.

### 4. Queue refresh ngay sau persistence, trước khi gửi success follow-up
**Decision:** Trên success path, sau khi `persistAttendanceVote(...)` trả về `refreshTarget`, handler sẽ gọi `queueAttendanceDiscordMessageRefresh(...)` trước khi gửi follow-up xác nhận.

**Rationale:**
- Public state update là tác vụ cốt lõi cần được bảo đảm sớm nhất sau khi persistence thành công.
- Nếu `followUp()` bị lỗi, refresh vẫn đã được lên lịch và coalescing vẫn hoạt động bình thường.

**Alternative considered:**
- Giữ thứ tự hiện tại: gửi feedback rồi mới queue refresh. Không chọn vì state propagation nên được ưu tiên hơn phản hồi phụ trợ.

### 5. Mở rộng structured timing logs thay vì thay scheduler
**Decision:** Tăng log metadata trong `backend/src/botAttendance.ts`, và chỉ enrich log context trong `backend/src/services/attendanceDiscordService.ts` nếu cần; không thay đổi cơ chế debounce/coalescing hiện tại.

**Rationale:**
- Scheduler hiện có đã được test cho coalescing, single-flight, và rerun behavior.
- Vấn đề chính là diagnosability của latency interaction, không phải logic refresh.
- Thêm các field như `ackType`, `ackMs`, `queuedRefresh`, `feedbackType`, `totalMsToQueue` sẽ giúp phân biệt nghẽn ở bước nào.

**Alternative considered:**
- Viết lại refresh scheduler hoặc thêm hàng đợi mới. Không cần thiết cho scope hiện tại.

## Risks / Trade-offs

- **[Risk]** `followUp()` có thể fail sau khi `deferUpdate()` thành công, khiến user không nhận được confirmation cá nhân. → **Mitigation:** log best-effort failure rõ ràng; public attendance message refresh vẫn chạy để phản ánh trạng thái mới.
- **[Risk]** Thay đổi từ `deferReply()` sang `deferUpdate()` đòi hỏi cập nhật mock/test harness cho button interaction. → **Mitigation:** mở rộng `botAttendance.test.ts` để assert explicit ack path mới và bao quát failure cases.
- **[Risk]** Nhiều log timing hơn có thể tạo thêm noise khi debug flag bật. → **Mitigation:** tiếp tục gate toàn bộ log mở rộng sau `DISCORD_ATTENDANCE_DEBUG` / `DISCORD_REALTIME_DEBUG`.
- **[Trade-off]** User feedback trở thành best-effort sau khi state đã được persist thay vì là phần gắn chặt với deferred reply lifecycle. → **Mitigation:** ưu tiên sự ổn định của acknowledge và public state; failure follow-up vẫn có thể chẩn đoán qua logs.