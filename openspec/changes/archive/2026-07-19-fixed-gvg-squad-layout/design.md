## Context

Repository đã loại bỏ lineup domain flexible trước đây. Bang Chiến mới là capability độc lập: mỗi guild có mười tổ đội cố định đánh số 1–10, mỗi tổ đội thuộc đúng một đoàn hiện tại, mỗi đoàn là container vô danh được gán nhãn từ thứ tự hiển thị. Mỗi đoàn có tối đa năm tổ đội; mỗi tổ đội có sáu slot thành viên bang đang hoạt động. Chỉ tên thành viên và class icon là cần thiết trên card.

Người có quyền xem guild có thể đọc layout. Chỉ bang chủ được thay đổi layout hoặc clear squad; edit-lock lifecycle cũ không được khôi phục. Server là nguồn xác thực cho mọi constraint, và client tải lại toàn bộ layout khi nhận `gvg_lineup_updated`.

## Goals / Non-Goals

**Goals:**
- Lưu danh tính ổn định cho mười tổ đội được đánh số 1–10 ở mỗi guild.
- Duy trì hai đến năm đoàn không rỗng, tối đa năm tổ đội mỗi đoàn và sáu slots mỗi tổ đội.
- Chặn một member thuộc nhiều tổ đội và chỉ chấp nhận member active của guild.
- Cho phép bang chủ kéo thả/sắp xếp/chuyển tổ đội, gán member và clear squad bằng full-layout atomic save.
- Render đoàn thành các lane dọc với squad cards một hàng ngang có horizontal overflow ở màn hình hẹp.
- Publish `gvg_lineup_updated` sau lưu hoặc clear thành công để clients refresh authoritative state.

**Non-Goals:**
- Custom division/squad names, division leaders, reserve slots, skills, snapshot, hoặc lineup edit lock.
- Tạo/xóa tổ đội; tối ưu hoá hoặc nhập tự động member assignment.
- Bảo toàn hoặc chuyển đổi dữ liệu flexible lineup cũ.

## Decisions

### Store globally numbered squads as first-class records

Mỗi guild sở hữu đúng mười squad records, có `squadNumber` từ 1 đến 10 và unique per guild. Squad tham chiếu division hiện tại, có thứ tự trong division và có sáu fixed slots. Cách này giữ `Tổ đội N` ổn định khi kéo qua division, thay vì suy ra số từ vị trí thay đổi.

### Persist divisions but derive their displayed labels

Division là ordered group record không có tên. Frontend render `Đoàn <orderIndex + 1>`; division trống không được gửi trong save payload và bị xóa sau atomic replacement. Khi squad cuối cùng rời đi, later divisions được đánh nhãn lại liên tiếp.

### Validate and save each complete layout atomically

Full-layout save gồm ordered divisions, ordered squad numbers và sáu member IDs/nulls cho mỗi squad. Backend validate 1–10 xuất hiện đúng một lần, có 2–5 divisions không rỗng, không division nào quá năm squads, đúng sáu slots, member active cùng guild và không duplicate member. Chỉ sau đó transaction cập nhật thứ tự, membership và slots; invalid input không tạo partial changes.

### Initialize a new layout deterministically

Khi guild chưa có layout, service tạo `Đoàn 1` với squads 1–5 và `Đoàn 2` với squads 6–10; tất cả slots rỗng. Legacy flexible layout data bị discard theo quyết định sản phẩm, không được normalize sang model mới.

### Restrict mutations to the guild owner and publish realtime state changes

Read access dùng `view:guild`. PUT full-layout và clear-squad xác minh role `owner`; không có `manage:lineup` permission hoặc edit lock. Đây là boundary đơn giản thay cho collaborative editing: concurrent saves dùng persisted state cuối cùng, và mỗi save/clear thành công publish `gvg_lineup_updated` để client refresh full layout.

### Use nested sortable drag-and-drop lanes with horizontal overflow

Workspace là danh sách lanes dọc; cards trong từng lane là sortable row không wrap. Drag có thể reorder origin lane hoặc transfer target lane còn capacity. Màn hình hẹp giữ lane một hàng và scroll ngang.

## Risks / Trade-offs

- [Bang chủ concurrent saves có thể overwrite nhau] → server validate/save nguyên tử và realtime refresh authoritative state sau mutation; collaborative locks không thuộc scope.
- [Dữ liệu flexible cũ không phù hợp model cố định] → discard dữ liệu cũ và deterministic initialize mười squads trống.
- [Full-layout payload lớn hơn mutation từng card] → model giới hạn mười squads/sáu slots nên payload nhỏ và atomic replacement an toàn hơn.
- [Division labels dịch khi division trống bị xóa] → labels là visual ordering; squad number là stable reference.
- [Mobile drag target khó dùng] → giữ accessible member-select/removal controls cùng horizontal lane scrolling.

## Migration Plan

1. Thêm models fixed division, squad và six-slot cùng migration constraints.
2. Deploy backend để lazy-initialize một layout hai division hợp lệ khi guild load layout/app state.
3. Deploy frontend constrained workspace sau backend.
4. Verify empty guild initialization, invalid/duplicate/capacity input, owner-only mutation, realtime refresh và narrow viewport.
5. Rollback application code không khôi phục flexible layout data; dùng database backup trước khi apply production migration nếu cần.

## Open Questions

- UI action thêm division và automatic removal khi squad cuối cùng rời đi là behavior cần được manual verify trong configured environment.
- Realtime end-to-end verification cần hai authenticated browser sessions trên cùng test guild.
