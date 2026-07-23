## Context

Workspace Bang Chiến hiện hiển thị từng vị trí thành viên bằng icon hoặc placeholder ở bên trái, dropdown thành viên ở giữa và nút gỡ ở bên phải. `GvgLineupWorkspace` chỉ loại thành viên đã được gán trong cùng tổ đội khỏi dropdown; backend mới là nơi chặn người xuất hiện trùng giữa các tổ đội. Danh sách `members` phía frontend đã có `classType` và `active`, đồng thời constants đã định nghĩa các phái cùng icon và màu tương ứng.

Bộ lọc phái được người dùng xác nhận là trạng thái tạm thời của giao diện, không phải yêu cầu phái được lưu cho vị trí.

## Goals / Non-Goals

**Goals:**

- Cho phép bang chủ chọn phái ở vùng nhỏ bên trái mỗi slot để lọc dropdown thành viên của riêng slot đó.
- Giảm chọn nhầm bằng cách chỉ hiển thị thành viên active chưa được xếp ở toàn bộ đội hình, trừ thành viên hiện có của chính slot.
- Đồng bộ bộ lọc hiển thị theo phái của thành viên sau khi chọn và trả về bộ lọc mặc định khi gỡ thành viên.
- Rút gọn điều khiển gỡ thành viên thành icon dấu trừ nhưng vẫn accessible.

**Non-Goals:**

- Không lưu phái lọc hoặc quy định phái bắt buộc cho slot.
- Không thay đổi database, API, payload lưu, permission, hay validation backend.
- Không thay đổi hành vi gỡ toàn bộ tổ đội hoặc drag-and-drop tổ đội.
- Không thêm thư viện UI mới.

## Decisions

### Giữ filter class trong local React state theo slot

Mỗi slot sẽ có filter state riêng, được định danh ổn định bằng squad number và slot index. State chỉ điều khiển dropdown đang hiển thị, không đi vào `GvgLineup`, `toSavePayload`, hoặc request API.

Lý do: filter là tiện ích thao tác tạm thời; thêm nó vào persisted lineup sẽ cần thay đổi Prisma, serializer, payload và semantics không cần thiết.

Phương án thay thế là chỉ lọc bằng phái của thành viên đã chọn. Phương án này không đáp ứng việc chọn phái trước cho slot trống nên bị loại.

### Tính member availability trên toàn bộ lineup

Trước khi render slot, frontend sẽ tổng hợp `memberId` không null từ toàn bộ divisions, squads và slots. Candidate list của slot hiện tại giữ lại member trùng `slot.memberId`, loại các member ID còn lại đã được gán và sau đó áp dụng class filter nếu đang có.

Lý do: điều này khớp quy tắc backend rằng mỗi người chỉ thuộc một tổ đội, tránh người dùng chọn tùy chọn mà server chắc chắn sẽ từ chối.

Phương án thay thế là chỉ loại trong mỗi `SquadCard`, như hiện tại. Phương án này để lộ lựa chọn không hợp lệ trên các tổ đội khác nên bị loại.

### Đồng bộ filter với selection nhưng không ghi đè lựa chọn tạm thời khi slot trống

Khi chọn thành viên, filter của slot sẽ phản ánh `member.classType`. Khi gỡ thành viên, filter của slot trở lại mặc định không lọc. Khi slot trống, bang chủ tự điều khiển filter và có thể đặt lại về “Tất cả phái”.

Lý do: icon/label bên trái luôn nhất quán với member đã chọn, đồng thời filter trống không bị lưu hay tồn tại ngoài phiên render.

### Giữ native select và thu gọn action gỡ

UI tiếp tục dùng native `<select>` để phù hợp code hiện có. Nút gỡ chuyển từ icon `UserMinus` thành ký hiệu dấu trừ nhỏ, với `aria-label="Gỡ thành viên"` và `title` giữ nguyên.

Lý do: thay đổi nhỏ, không phát sinh dependency hoặc khác biệt keyboard/accessibility từ custom dropdown.

## Risks / Trade-offs

- [Filter state biến mất khi component unmount hoặc dữ liệu lineup reload] → Đây là hành vi chấp nhận được vì filter được xác định là tạm thời; selection lưu thành viên vẫn tồn tại qua API.
- [Một member inactive vẫn có trong `members`] → Candidate list phải tiếp tục lọc theo `member.active !== false` để chỉ đưa member active vào lựa chọn.
- [State optimistic và realtime reload có thể thay dữ liệu trong khi đang chọn] → Tính lại assigned IDs từ `lineup` render hiện tại; backend vẫn là lớp validation cuối và UI đã có luồng reload khi lưu lỗi.
- [Nhiều native selects trên một card làm UI chật] → Selector phái được đặt trong vùng icon nhỏ bên trái và nhãn ngắn/icon, nút dấu trừ chỉ chiếm diện tích tối thiểu.
