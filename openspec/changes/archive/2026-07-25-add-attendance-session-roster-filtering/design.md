## Context

Workspace xếp đội hình hiện lấy candidate từ toàn bộ member active và chỉ kiểm tra member chưa thuộc squad khác. Attendance đã có các session GvG và Scrim, vote `GO`/`NOGO`, history gần đây, và realtime `attendance_updated`; nhưng lineup chưa mang ngữ cảnh attendance session nào. Request cập nhật slot cũng chỉ gửi danh sách member ID, nên rule ở UI có thể bị bypass qua API.

Thay đổi này áp dụng cho guild owner — quyền hiện có để chỉnh lineup. Attendance state đã được trả trong app state, vì vậy owner không cần thêm quyền `manage:attendance` để dùng session hiện hữu làm nguồn roster.

## Goals / Non-Goals

**Goals:**
- Cho phép owner chọn `Tất cả thành viên` hoặc một attendance session GvG/Scrim đang mở hay trong lịch sử gần đây làm nguồn roster.
- Khi session được chọn, giới hạn assignment mới vào thành viên active có vote `GO` trong chính session đó.
- Lưu nguồn session vào GvG lineup để reload, realtime và backend validation dùng chung một source of truth.
- Giữ assignment đang tồn tại khi session được chọn hoặc vote thay đổi; thể hiện rõ các assignment không còn eligible.
- Enforce eligibility ở backend cho mọi mutation slot và trả canonical lineup sau khi cập nhật.

**Non-Goals:**
- Không thay đổi quy trình mở/đóng/vote attendance, enum vote, hoặc ý nghĩa `MAYBE`.
- Không tự động gỡ assignment khi vote thay đổi.
- Không biến GvG lineup thành một mô hình lineup Scrim riêng hoặc tạo lịch sử lineup theo từng session.
- Không thêm quyền mới hay dependency UI mới.

## Decisions

### 1. Persist `attendanceSessionId` tùy chọn trên GvG lineup

**Decision:** GvG lineup có nullable `attendanceSessionId`. `null` nghĩa là nguồn `Tất cả thành viên`; một ID khác `null` liên kết lineup với một AttendanceSession cụ thể thuộc cùng guild, bất kể type `GVG` hay `SCRIM`.

**Rationale:** Persisted source giữ ngữ cảnh nhất quán khi reload, client khác nhận realtime update, hoặc session đóng sau khi được chọn. Backend không phải suy luận phiên `OPEN` dễ thay đổi.

**Alternative considered:** Giữ session chỉ trong local frontend state. Bị loại vì reload mất selection và API không có source đáng tin cậy để enforce rule.

### 2. Validate complete desired slot state, nhưng grandfather assignment hiện hữu

**Decision:** Khi mutation thay slot, backend lấy assignment hiện tại của squad và source session của lineup. Mọi member mới xuất hiện vào slot (không có trong squad trước mutation) MUST là active và có AttendanceVote `GO`; member đã nằm trong cùng squad trước mutation được phép giữ lại dù vote đã đổi. Nếu source session thay đổi, state slot hiện có được giữ, còn các assignment mới sau đó bị validate theo source mới.

**Rationale:** Không làm mất roster do vote realtime, đồng thời không cho thêm người không đăng ký. Validation theo complete payload vẫn giữ invariant sáu slot, uniqueness trong lineup, và atomic update.

**Alternative considered:** Bắt toàn bộ member trong payload phải `GO`. Bị loại vì admin không thể lưu thay đổi nhỏ hoặc clear một đội khi có người đã đổi vote.

### 3. Tái sử dụng app-state attendance cho roster selector và candidate filter

**Decision:** App truyền attendance state vào `GvgLineupWorkspace`. Workspace tổng hợp active và recent session của cả GvG/Scrim, hiển thị source selector, và suy ra set member ID `GO` client-side. Candidate helper nhận eligible set tùy chọn, nhưng vẫn bao gồm current-slot member để render assignment cũ và cảnh báo nếu member đó outside eligibility.

**Rationale:** Không cần endpoint đọc mới; app-state và realtime refresh hiện có đã cung cấp dữ liệu session/vote. Candidate UI phản hồi tức thời khi `attendance_updated` được đồng bộ.

**Alternative considered:** Tạo endpoint trả danh sách eligible members. Bị loại vì trùng dữ liệu đã gửi, tăng round trip và vẫn không thay thế server-side write validation.

### 4. Source selection là mutation owner-only và canonical

**Decision:** Tạo mutation lineup owner-only để đặt/xóa `attendanceSessionId`, validate session tồn tại và cùng guild, rồi publish `gvg_lineup_updated`. API slot update không lấy session ID từ client request mà validate theo source đã persist của lineup.

**Rationale:** Tránh client tự gửi một ID session khác với source UI đang hiển thị. Mọi client sau realtime đều nhận cùng source roster và backend có một rule rõ ràng tại thời điểm ghi.

**Alternative considered:** Gửi `attendanceSessionId` trong từng PUT slot. Bị loại vì request slot không thể đảm bảo source được lưu/canonical, và mỗi mutation có thể vô tình áp dụng rule khác.

## Risks / Trade-offs

- **[Source đổi khi lineup đã có người không GO]** → Giữ assignment hiện tại, đánh dấu warning, và validate chỉ assignment mới.
- **[Session bị xóa hoặc không có trong recent state]** → Backend không cho chọn session không thuộc guild; frontend render source hiện tại với empty/warning fallback và owner có thể reset về tất cả member.
- **[Nhiều session cùng type]** → Selector hiển thị type, thời điểm, status và tổng `GO` để tránh mơ hồ.
- **[Race giữa vote và slot mutation]** → Backend query vote tại transaction/mutation time; frontend filter chỉ là UX hỗ trợ.
- **[Schema migration deploy failure]** → Migration thêm nullable FK trước, nên rollback application vẫn hoạt động với source `null`; rollback schema chỉ sau khi không còn app version dùng field.
