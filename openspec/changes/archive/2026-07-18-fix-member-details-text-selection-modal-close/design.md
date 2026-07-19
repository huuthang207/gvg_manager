## Context

`MemberDetailModal` đóng bằng click trực tiếp trên backdrop phủ toàn màn hình. Nội dung hội thoại chỉ chặn bubble của click xảy ra trong vùng hội thoại. Khi người dùng kéo để chọn tên trong input rồi thả chuột trên backdrop, click kết thúc có thể được gửi tới backdrop và gọi `onClose`, dù thao tác bắt đầu trong modal.

Thay đổi chỉ thuộc frontend, trong `frontend/src/features/members/MemberDashboard.tsx`; không thay đổi API, schema, hoặc trạng thái dữ liệu phía backend.

## Goals / Non-Goals

**Goals:**

- Modal chỉ đóng qua backdrop khi cùng thao tác pointer bắt đầu trên backdrop và kết thúc bằng click trên backdrop.
- Một drag/chọn văn bản bắt đầu trong nội dung modal không thể kích hoạt đóng backdrop.
- Giữ nguyên nút đóng, hành vi đóng sau khi lưu thành công, và backdrop dismissal cho click/tap chủ ý.

**Non-Goals:**

- Không thay đổi nội dung, validation, hoặc quy trình lưu thông tin thành viên.
- Không bổ sung dialog xác nhận khi đóng hoặc cơ chế lưu nháp.
- Không thay đổi cách các modal khác trong ứng dụng xử lý backdrop.

## Decisions

### Chỉ chấp nhận dismissal khi pointer bắt đầu trên backdrop

Backdrop sẽ theo dõi điểm bắt đầu của thao tác pointer và chỉ gọi `onClose` khi sự kiện click trên backdrop thuộc về một thao tác đã bắt đầu trên chính backdrop. Điều này biểu đạt đúng ý định: click/tap trực tiếp ra ngoài hội thoại đóng modal, còn selection drag khởi đầu từ input thì không.

**Alternatives considered:**

- **Bỏ backdrop dismissal:** ngăn lỗi nhưng làm mất hành vi đóng quen thuộc.
- **Chặn `click` trên từng input:** không bao quát selection/drag từ các phần tử tương tác khác và khiến logic phân tán.
- **Kiểm tra `window.getSelection()`:** phụ thuộc trạng thái selection theo trình duyệt, không phân biệt rõ một click chủ ý sau khi có selection, và không phù hợp cho tap.

### Giữ logic cục bộ trong MemberDetailModal

Trạng thái gesture và điều kiện dismissal được giữ tại modal thay vì thêm document listener hoặc thay đổi state coordinator của dashboard. Cách này giới hạn thay đổi vào thành phần sở hữu backdrop và tránh ảnh hưởng các popover/filter listener hiện có.

**Alternatives considered:**

- **Document-level pointer listener:** phạm vi rộng, dễ ảnh hưởng thành phần khác và cần cleanup phức tạp hơn.

## Risks / Trade-offs

- [Khác biệt tổng hợp event giữa mouse/touch/pointer] → Dựa vào React pointer/click events được hỗ trợ rộng rãi và giữ `onClick` làm điểm đóng cuối cùng để hỗ trợ keyboard/click thông thường.
- [Trạng thái pointer cũ sau một gesture bị hủy] → Xóa/cập nhật trạng thái khi pointer kết thúc hoặc hủy để gesture kế tiếp được đánh giá độc lập.
- [Regression backdrop dismissal] → Bổ sung test hoặc kiểm chứng tương tác: click backdrop vẫn đóng; kéo chọn từ input sang backdrop không đóng.
