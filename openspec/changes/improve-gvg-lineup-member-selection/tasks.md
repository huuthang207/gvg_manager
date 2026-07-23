## 1. Lọc ứng viên theo phái và trạng thái đội hình

- [x] 1.1 Bổ sung helper hoặc logic UI để thu thập member ID đã được gán trên toàn bộ `GvgLineup`, đồng thời tính candidate list active cho từng slot và chỉ giữ lại member hiện tại của chính slot.
- [x] 1.2 Thêm local state theo `squadNumber` và `slotIndex` cho temporary class filter, dùng danh sách phái/icon hiện có và không đưa state này vào `GvgLineup` hoặc save payload.
- [x] 1.3 Cập nhật `SquadCard` để selector phái bên trái lọc dropdown thành viên, đồng bộ sang phái của member sau khi chọn và reset về không lọc khi gỡ member.

## 2. Tinh chỉnh điều khiển gỡ và xác minh

- [x] 2.1 Thay nút gỡ thành viên bằng nút dấu trừ nhỏ, vẫn giữ `aria-label`, tooltip và trạng thái hover rõ ràng.
- [x] 2.2 Thêm hoặc cập nhật frontend test/hàm thuần để kiểm tra lọc theo phái, loại member đã gán ở tổ đội khác, giữ member của chính slot và tái xuất hiện sau khi gỡ.
- [x] 2.3 Chạy `npm run lint` trong `frontend/` và chạy test liên quan; xử lý mọi lỗi type hoặc test phát sinh.
