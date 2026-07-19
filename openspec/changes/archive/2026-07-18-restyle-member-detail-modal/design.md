## Context

Modal `MemberDetailModal` hiện được khai báo trong `frontend/src/features/members/MemberDashboard.tsx`. Modal giữ các luồng quản trị quan trọng: cập nhật tên ingame, đổi phái và Discord role, gỡ role Bang Viên, đóng bằng backdrop có bảo vệ text selection. Tuy nhiên presentation của nó dùng hero gradient và các button riêng, không đồng bộ với pattern modal slate tối đã dùng ở `GvgParticipationModal` và các modal attendance mới.

Thay đổi chỉ nằm trong frontend presentation của component hiện hữu. Quyền mở modal, callback, state local, API và dữ liệu `Member` phải được giữ nguyên.

## Goals / Non-Goals

**Goals:**

- Đồng bộ visual hierarchy, surface, spacing, button states và dialog semantics của MemberDetailModal với các modal quản trị hiện tại.
- Làm rõ nhóm thông tin hồ sơ, Discord, quản lý phái và thao tác phá hủy.
- Giữ nguyên tất cả interaction hiện có, bao gồm intentional backdrop dismissal và bảo toàn nội dung khi người dùng kéo chọn text từ trong dialog ra backdrop.
- Bảo đảm giao diện dùng được trên desktop và viewport nhỏ với vùng nội dung cuộn hợp lý.

**Non-Goals:**

- Không thay đổi API, Prisma schema, data serialization hoặc logic phân quyền.
- Không mở quyền xem modal cho người không có `canManageMembers`.
- Không thay đổi hành vi lưu, validation, đồng bộ Discord role hoặc quy trình xác nhận trước khi gỡ role.
- Không tách component sang file mới hoặc xây dựng design-system/modal primitive mới.

## Decisions

### Reuse the established administrative modal pattern

Modal SHALL dùng shell tương tự `GvgParticipationModal`: backdrop tối blur, panel `bg-slate-950`, border slate, header gọn với icon, title, subtitle, close control và footer rõ ràng. Điều này mang lại sự nhất quán với UI đã được dùng cho flow quản trị gần đây mà không tạo dependency mới.

Alternative considered: giữ header gradient và chỉ đổi button. Phương án này không xử lý sự khác biệt về hierarchy và spacing, nên bị loại bỏ.

### Preserve existing component boundaries and behavior

Refactor trực tiếp JSX/class names trong `MemberDetailModal`; state `ingameName`, `selectedClass`, trạng thái saving và pointer-backdrop handlers vẫn được giữ. Điều này giới hạn scope và tránh regression ở các callback do `MemberDashboard` truyền vào.

Alternative considered: tách modal và dùng shared modal primitive. Sự thay đổi chỉ ảnh hưởng một modal, nên abstraction mới sẽ tăng scope mà không có lợi ích rõ ràng.

### Group content by task and use shared button utilities

Nội dung được tổ chức theo thứ tự: nhận diện thành viên, chỉnh hồ sơ, thông tin Discord, quản lý phái, khu vực nguy hiểm. Các action SHALL dùng `app-button-primary`, `app-button-secondary`, `app-button-danger` cùng các disabled/focus-visible style phù hợp. Hành động gỡ role được đặt trong warning surface để làm rõ tính phá hủy.

Alternative considered: giữ các card độc lập như hiện tại. Cách này làm action nguy hiểm dễ bị nhìn như action thông thường và tạo nhiều visual surface hơn cần thiết.

### Add explicit dialog semantics without adding focus trapping

Panel SHALL khai báo `role="dialog"`, `aria-modal="true"` và liên kết tiêu đề thông qua `aria-labelledby`; close button SHALL có accessible name. Đây là cải thiện semantic không làm thay đổi focus behavior hiện tại hoặc cần thêm thư viện.

Alternative considered: thêm focus trap và Escape-key handling. Đây là cải thiện accessibility đáng giá nhưng vượt scope restyle và có nguy cơ thay đổi interaction chưa được xác nhận.

## Risks / Trade-offs

- [Refactor JSX có thể vô tình thay đổi backdrop behavior] → Giữ nguyên pointer-down ref và kiểm tra thủ công cả click backdrop trực tiếp lẫn text selection kéo ra ngoài.
- [Nhiều section tạo modal dài trên mobile] → Dùng max-height và vùng nội dung cuộn; ưu tiên compact spacing của pattern modal hiện hữu.
- [Utility button class không đủ cho focus state] → Bổ sung focus-visible class tại các control mới/chỉnh sửa thay vì thay đổi global utility dùng ở các màn hình khác.
- [Dữ liệu Discord có thể thiếu] → Tiếp tục dùng fallback tên hiện hữu và chỉ render username khi có dữ liệu.

## Migration Plan

1. Cập nhật JSX và Tailwind utilities của `MemberDetailModal` trong `MemberDashboard.tsx`.
2. Chạy frontend type-check/lint và production build.
3. Mở modal bằng tài khoản có quyền quản lý, xác nhận lưu tên, đổi phái, trạng thái chưa cấu hình Discord role, đóng backdrop/nút Đóng và action gỡ role vẫn kích hoạt đúng flow xác nhận.
4. Rollback bằng cách khôi phục component JSX trước thay đổi; không có migration dữ liệu hay rollout backend.

## Open Questions

Không còn câu hỏi mở cho scope này; phương án tham chiếu đã được xác nhận là pattern modal quản trị hiện tại, đặc biệt GvG participation modal.
