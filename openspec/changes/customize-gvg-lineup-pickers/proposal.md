## Why

Các native `<select>` trong workspace đội hình Bang Chiến đang có popup do trình duyệt/hệ điều hành kiểm soát, có thể hiển thị nền trắng cùng chữ trắng và khó đọc. Chúng cũng không thể hiển thị icon môn phái hay phản hồi trực quan về phái đang được lọc, khiến việc xếp đội hình chậm và dễ chọn nhầm.

## What Changes

- Thay selector phái native bằng class picker tùy biến, dark-theme, hiển thị icon và tên môn phái.
- Đổi màu nền và viền mỗi slot theo phái đã lọc ngay cả khi slot đang trống; sau khi chọn thành viên, màu luôn đồng bộ theo `classType` của thành viên đó.
- Thay dropdown chọn thành viên native bằng member picker dark-theme nhất quán, có tìm kiếm và hiển thị icon/badge môn phái cho từng lựa chọn.
- Giữ các quy tắc hiện có: chỉ chọn thành viên active, loại người đã được xếp ở slot khác, giữ người hiện tại của slot trong danh sách, và không lưu class filter vào lineup/API/database.
- Cung cấp đóng menu bằng click ngoài hoặc phím `Escape`, cùng nhãn truy cập đầy đủ cho các control tùy biến.

## Capabilities

### New Capabilities
- Không có.

### Modified Capabilities
- `fixed-gvg-squad-layout`: Thay cơ chế chọn phái và thành viên trong slot bằng các picker dark-theme tùy biến, đồng thời cung cấp phản hồi màu theo phái.

## Impact

- Affected frontend: `frontend/src/features/gvg-lineup/GvgLineupWorkspace.tsx`, các helper/layout test liên quan và có thể thêm component picker nội bộ cho feature GvG lineup.
- Reuse: icon/màu phái từ `frontend/src/constants.ts` và scrollbar/theme utilities trong `frontend/src/index.css`.
- Không thay đổi backend API, Prisma schema, database migration, permission hay payload lưu đội hình.
- Không thêm dependency UI mới; các picker dùng React, Tailwind CSS và icon đã có trong dự án.
