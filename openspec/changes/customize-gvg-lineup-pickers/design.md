## Context

Workspace Bang Chiến hiện render mỗi slot bằng native `<select>` để lọc phái và chọn thành viên. Browser/OS quyết định style của popup native nên giao diện có thể xuất hiện nền trắng với chữ trắng, không đồng bộ với giao diện slate dark. Code đã có `classFilters` local state, `getAvailableGvgMembers`, `getClassIcon`, `getClassColor`, toàn bộ class icon và màu chuẩn; filter chỉ là trạng thái thao tác tạm thời, còn assignment vẫn được lưu qua lineup API.

Thay đổi cần giữ behavior assignment và drag-and-drop hiện có, nhưng thay hai control native bằng các popup React do ứng dụng render để đảm bảo màu, icon, search và keyboard behavior nhất quán.

## Goals / Non-Goals

**Goals:**

- Cung cấp class picker dark-theme theo mỗi slot, dùng icon và tên môn phái, có thao tác bỏ lọc.
- Phản hồi bằng màu nền/viền slot ngay khi chọn class filter; assignment có phái sẽ luôn ưu tiên màu class của member.
- Cung cấp member picker dark-theme có tìm kiếm tên và trình bày icon/badge phái trong từng option.
- Duy trì candidate eligibility, optimistic persistence, quyền chỉnh sửa, và accessibility tương đương hoặc tốt hơn native control.

**Non-Goals:**

- Không thay đổi Prisma, API, payload, validation backend hoặc semantics assignment.
- Không lưu class filter, trạng thái mở popup, hay search query vào `GvgLineup`.
- Không thay đổi drag-and-drop tổ đội, clear squad, số lượng slot, hay thêm thư viện UI/positioning mới.
- Không đổi các native select ngoài workspace Bang Chiến.

## Decisions

### Tạo picker nội bộ bằng button và popup React thay cho native `<select>`

Mỗi slot sẽ render class trigger và member trigger là các semantic `<button>`; popup tương ứng là surface dark-theme dùng border `slate`, `bg-slate-950/900`, shadow tối và `custom-scrollbar`. Class picker dùng grid các button icon + tên. Member picker có một input search và danh sách button candidates gồm tên cùng class icon/badge.

Lý do: popup native không cho style option nhất quán và không hỗ trợ icon. React popup kiểm soát đầy đủ màu, typography, focus/hover và content theo thiết kế hiện có. Không dùng library popover mới để giữ dependency và scope nhỏ.

Phương án thay thế là style `<option>` qua CSS; bị loại vì renderer option không thống nhất giữa browser/OS và không đảm bảo ảnh/icon hoạt động.

### Giữ local filter theo slot, ưu tiên class của assigned member

`classFilters` tiếp tục định danh bằng `squadNumber:slotIndex` và chỉ điều khiển filter của slot trống. Màu/biểu tượng effective class được tính là `slot.member.classType ?? classFilters[key] ?? null`: assigned member luôn là nguồn sự thật; khi gỡ member, filter bị reset để slot về neutral.

Lý do: người dùng thấy phản hồi màu ngay khi chuẩn bị slot, nhưng UI không được lệch class thực tế của thành viên. Điều này giữ nguyên quyết định state tạm thời của change trước.

Phương án thay thế là persist class cho slot; bị loại vì biến filter thành data domain và đòi thay đổi database/API không cần thiết.

### Centralize trạng thái popup tại workspace và đảm bảo một popup mở mỗi lúc

`GvgLineupWorkspace` quản lý popup slot đang mở và query tìm kiếm theo popup member. Trigger mở picker sẽ đóng popup khác; chọn filter/member, click ngoài hoặc `Escape` sẽ đóng popup. Sự kiện pointer/keyboard phải không khởi động drag squad khi thao tác bên trong popup.

Lý do: chỉ một popup giúp không che chồng cards, đơn giản hóa click-outside/Escape và tránh search state bị phân mảnh. Scope của state vẫn chỉ nằm ở frontend render session.

Phương án thay thế là state độc lập trong từng `SquadCard`; bị loại vì dễ tạo nhiều popup đồng thời và phức tạp hơn khi xử lý click ngoài.

### Reuse class color/icon và một helper màu alpha an toàn

Màu slot lấy từ `getClassColor` và tạo background/border rgba/hex-alpha ở opacity thấp, bảo toàn chữ `slate-100/200` và icon control dễ đọc. Class không có icon (`Chưa xác định`, `Xung đột role phái`) dùng fallback symbol/text accessible và màu fallback đã định nghĩa.

Lý do: duy trì một source of truth cho màu/icon trên toàn app, giảm mismatch với Attendance và Member dashboard. Không tô màu đặc hoàn toàn để tránh giảm contrast trên dark theme.

## Risks / Trade-offs

- [Popup bị che/cắt bởi scroll container hoặc card kế bên] → render popup với positioning/stacking context phù hợp, `z-index` rõ ràng, và kiểm tra ở cả card đầu/cuối của lane.
- [Click trong picker kích hoạt drag squad] → chỉ gắn drag listener vào grip; chặn propagation hợp lý ở control/popup.
- [Keyboard/focus behavior kém hơn native select] → dùng button/input semantic, `aria-expanded`, `aria-controls`, `aria-label`; focus input search khi mở member picker; hỗ trợ `Escape` và trả focus về trigger.
- [Query không còn khớp candidates khi lineup realtime thay đổi] → candidate list luôn tính từ `members`, `assignedMemberIds`, `slot.memberId`, effective class ở render hiện tại; đóng popup sau mutation.
- [Danh sách member dài] → lọc client-side không phân biệt hoa thường theo name, đặt max-height và `custom-scrollbar`; hiển thị empty state rõ ràng.
- [Màu phái làm giảm độ tương phản] → chỉ dùng alpha thấp cho surface/border và giữ foreground neutral sáng; dùng hover/focus ring nhất quán với app.
