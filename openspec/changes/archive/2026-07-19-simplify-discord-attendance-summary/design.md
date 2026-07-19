## Context

Thông điệp điểm danh Discord được dựng dưới dạng văn bản trong `attendanceRenderService`. `renderSummary` hiện tính tổng vote, số tham gia, số không tham gia và tổng hợp số lượng theo phái. Dữ liệu theo phái vẫn cần cho danh sách người tham gia được nhóm theo phái và cho mỗi người trong danh sách không tham gia.

Đây là thay đổi trình bày cục bộ cho nội dung Discord; không cần thay đổi dữ liệu, API hoặc cơ chế Discord message refresh.

## Goals / Non-Goals

**Goals:**
- Làm phần summary của vote điểm danh trên Discord gọn hơn.
- Hiển thị tổng số vote với biểu tượng `🗳️`.
- Bảo toàn nội dung chi tiết theo phái trong các danh sách vote hiện có.
- Bảo vệ định dạng mới bằng unit test của attendance renderer.

**Non-Goals:**
- Không thay đổi số liệu vote, persistence, button interaction hoặc cơ chế cập nhật Discord message.
- Không thay đổi format danh sách tham gia và không tham gia.
- Không thay đổi hiển thị attendance trong frontend hoặc API response.

## Decisions

### Chỉ thay đổi các dòng summary được render
`renderSummary` sẽ chỉ tạo ba chỉ số: `🗳️ Tổng vote`, `✅ Tham gia`, và `❌ Không tham gia`.

**Rationale:** Điểm tích hợp này là nguồn duy nhất của nội dung public Discord, nên thay đổi nhỏ, không ảnh hưởng dữ liệu hay các luồng refresh.

**Alternative considered:** Loại bỏ việc tính/group phái ở toàn renderer. Không chọn vì `renderGoList` vẫn dùng phái để nhóm người tham gia, và `renderChoiceList` vẫn phải hiển thị phái cho từng người không tham gia.

### Dùng emoji Unicode `🗳️` trực tiếp
Biểu tượng được đặt ngay trước nhãn tổng vote, đồng nhất với các emoji đã dùng cho hai trạng thái lựa chọn.

**Rationale:** Không cần thêm Discord custom emoji, cấu hình, hoặc dependency, và render ổn định trong plaintext code block.

### Cập nhật các test định dạng summary
Tests sẽ xác nhận icon mới xuất hiện và dòng `Theo phái` không xuất hiện khi có vote hoặc khi không có vote; vẫn xác nhận các danh sách chi tiết theo phái giữ nguyên.

**Rationale:** Ngăn việc format cũ quay lại mà vẫn bảo vệ phạm vi không thay đổi của dữ liệu chi tiết.

## Risks / Trade-offs

- [Người dùng mất số lượng phái nhìn thấy ngay trong summary] → Thông tin phái vẫn có trong danh sách tham gia được nhóm theo phái và các chi tiết từng người.
- [Emoji Unicode có thể được Discord hiển thị khác nhau theo nền tảng] → Dùng emoji chuẩn giống các emoji hiện có trong cùng thông điệp; số liệu và nhãn vẫn đọc được nếu emoji không hiển thị.
- [Test cũ mong đợi dòng đã bị loại bỏ] → Cập nhật assertions để phản ánh hợp đồng hiển thị mới.
