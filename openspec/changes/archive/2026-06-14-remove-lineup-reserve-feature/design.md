## Context

Khái niệm `reserve / standby / MAYBE` hiện tồn tại như một domain xuyên tầng: Discord attendance buttons, attendance vote summary, attendance import modal, lineup drag/drop, team card UI, snapshot persistence, và serializer. Điều này tạo ra mô hình hai-lane trong lineup (`memberIds` + `reserveMemberIds`) và mô hình ba-trạng-thái trong attendance (`GO`, `MAYBE`, `NOGO`).

Thay đổi này cần loại bỏ toàn bộ lane `reserve` và trạng thái `MAYBE`, nên đây là một cross-cutting cleanup giữa frontend, backend, shared contracts, và backward compatibility cho dữ liệu cũ. Hệ thống hiện có khả năng đã lưu snapshot cũ chứa `reserveMemberIds` và session attendance cũ chứa vote `MAYBE`, vì vậy read path phải an toàn khi gặp dữ liệu legacy.

## Goals / Non-Goals

**Goals:**
- Loại bỏ hoàn toàn `reserveMemberIds` khỏi lineup model hiện hành.
- Loại bỏ hoàn toàn reserve slots và reserve UI khỏi màn hình lineup và saved lineup.
- Loại bỏ hoàn toàn lựa chọn `MAYBE` khỏi attendance flow mới, Discord attendance buttons, và summary/render hiện hành.
- Đơn giản hóa attendance import để chỉ còn một lane thành viên được nhập vào lineup.
- Giữ khả năng đọc/restore dữ liệu cũ có `reserveMemberIds` hoặc `MAYBE` mà không làm hỏng hệ thống.

**Non-Goals:**
- Không thay đổi class/skill system ngoài các logic hiện phụ thuộc reserve slots.
- Không migrate dữ liệu cũ tại storage theo batch; compatibility sẽ được xử lý ở read path và runtime mapping.
- Không thay đổi nghiệp vụ `GO` / `NOGO` ngoài việc bỏ `MAYBE`.

## Decisions

### 1. Chuẩn hóa attendance về 2 trạng thái `GO` và `NOGO`
- **Decision**: Attendance flow mới chỉ chấp nhận `GO` và `NOGO`; Discord buttons và render summary sẽ bỏ `MAYBE`.
- **Rationale**: Nếu lineup không còn reserve lane nhưng attendance vẫn giữ `MAYBE`, domain sẽ lệch nhau và phát sinh logic mapping mơ hồ. Chuẩn hóa attendance giúp hệ thống đơn giản và nhất quán.
- **Alternative considered**: Giữ `MAYBE` trong attendance nhưng không import vào lineup. Phương án này đơn giản hơn khi code backend, nhưng giữ lại complexity ở domain và UI.

### 2. Chuẩn hóa lineup về một lane `memberIds`
- **Decision**: Team, snapshot, serializer, và drag/drop sẽ chỉ còn `memberIds`; bỏ `reserveMemberIds` và toàn bộ slot ID/skill mapping kiểu `reserve-*`.
- **Rationale**: Lane reserve hiện không còn giá trị khi business rule chuyển sang chỉ có một danh sách thành viên được xếp đội. Giữ lane dự bị chỉ làm tăng branch logic trong DnD, import, persistence, và rendering.
- **Alternative considered**: Giữ `reserveMemberIds` nội bộ nhưng ẩn UI. Phương án này không đạt mục tiêu đơn giản hóa domain và để lại dead paths trong dữ liệu.

### 3. Legacy data được đọc nhưng reserve/maybe bị bỏ qua
- **Decision**: Snapshot cũ có `reserveMemberIds` vẫn được đọc, nhưng reserve data bị bỏ qua khi restore về model mới. Attendance session cũ có vote `MAYBE` vẫn render an toàn; vote `MAYBE` sẽ không còn được tạo mới và không còn tham gia vào import lineup mới.
- **Rationale**: Đây là cách cân bằng giữa backward compatibility và cleanup triệt để. Không cần batch migration, nhưng hệ thống vẫn không bị crash khi gặp dữ liệu cũ.
- **Alternative considered**: Migration dữ liệu toàn bộ trước khi deploy. Phương án này phức tạp hơn, tạo thêm rủi ro vận hành mà không cần thiết cho repo hiện tại.

### 4. Import attendance chỉ nhận một danh sách thành viên hợp lệ
- **Decision**: Attendance import payload sẽ chỉ còn một lane để đẩy thành viên vào các slot chính trống; checkbox `includeNotVoted` và reserve import path sẽ bị loại bỏ.
- **Rationale**: Khi reserve không còn tồn tại, việc nhập người `MAYBE` hoặc `chưa điểm danh` vào lane phụ không còn ý nghĩa. Điều này cũng làm rõ rule mới: lineup chỉ nhận những người được hệ thống coi là tham gia hợp lệ.
- **Alternative considered**: Đẩy người chưa điểm danh vào cuối `memberIds`. Phương án này gây mơ hồ nghiệp vụ và có thể làm lineup chứa người chưa xác nhận.

## Risks / Trade-offs

- **[Dữ liệu snapshot cũ chứa reserve members]** → Mitigation: Restore path tolerant, bỏ qua reserve data thay vì fail.
- **[Attendance session cũ có `MAYBE`]** → Mitigation: Giữ render/read compatibility cho dữ liệu cũ, nhưng chặn tạo mới `MAYBE` và bỏ ảnh hưởng của nó khỏi import mới.
- **[Thay đổi domain rộng dễ sót reference]** → Mitigation: Cleanup từ shared type boundary, chạy grep cho `reserveMemberIds`, `MAYBE`, `summary.maybe`, và cập nhật tests ở cả frontend/backend.
- **[Mất nuance “có thể tham gia” của nghiệp vụ cũ]** → Mitigation: Chốt rõ domain mới trong specs và UI copy, tránh behavior nửa cũ nửa mới.

## Migration Plan

1. Cập nhật shared lineup/attendance contracts để bỏ `reserveMemberIds` và `MAYBE` khỏi flow mới.
2. Cập nhật frontend lineup UI và DnD để chỉ còn main slots.
3. Cập nhật attendance import modal và import logic để chỉ còn một lane nhập.
4. Cập nhật backend attendance buttons, vote parsing, summary/render, và validation để bỏ `MAYBE`.
5. Cập nhật serializer, snapshot save path, và restore path để bỏ reserve persistence nhưng vẫn đọc được legacy data.
6. Cập nhật tests/verification cho serializer, snapshot compatibility, attendance flow, và lineup UI compile-time behavior.

## Open Questions

- Attendance render hiện nên hiển thị dữ liệu lịch sử `MAYBE` như thế nào trong session cũ sau khi domain mới được deploy?
- Payload attendance import mới nên đặt tên lane duy nhất là `memberIds` hay giữ `mainMemberIds` để giảm diff bề mặt API?
- Có view/report nào ngoài lineup và attendance đang phụ thuộc `summary.maybe` hoặc reserve counts mà chưa được rà tới không?
