## Context

Tính năng lineup hiện chứa hai lớp behavior vượt ra ngoài việc sắp xếp người vào slot: assignment summary UI (`Phân công của bạn`, `Danh sách phân công`) và member note metadata (`memberNotes`) được lưu cùng team/snapshot. Phần này trải qua nhiều lớp từ `MainBoard.tsx`, shared lineup types, serializer backend, đến snapshot persistence.

Thay đổi này là một cross-cutting cleanup vì nó tác động đồng thời tới frontend presentation, shared data contract, backend serialization, và compatibility khi đọc snapshot cũ. Hệ thống hiện có khả năng đã lưu snapshot chứa `memberNotes`, nên việc loại bỏ cần đảm bảo quá trình đọc dữ liệu cũ vẫn an toàn dù field này không còn được sử dụng trong model mới.

## Goals / Non-Goals

**Goals:**
- Loại bỏ hoàn toàn assignment summary UI khỏi màn hình lineup.
- Loại bỏ `memberNotes` khỏi mô hình dữ liệu lineup hiện hành ở frontend và backend.
- Loại bỏ callback, state, prop, serializer field, và update flow chỉ phục vụ member assignment note.
- Đảm bảo snapshot mới không còn ghi `memberNotes`.
- Đảm bảo dữ liệu snapshot cũ có `memberNotes` vẫn có thể được đọc mà không làm hỏng luồng restore.

**Non-Goals:**
- Không thay đổi behavior kéo thả, sắp slot, reserve slot, slot skill, hoặc leader selection của lineup.
- Không thay đổi member management ngoài những tích hợp trực tiếp với lineup assignment/note flow.
- Không migrate hoặc rewrite dữ liệu snapshot cũ trên storage; compatibility sẽ được xử lý ở read path.

## Decisions

### 1. Xóa assignment UI hoàn toàn khỏi `MainBoard.tsx`
- **Decision**: Gỡ toàn bộ section `Phân công của bạn` và `Danh sách phân công`, cùng toàn bộ state/computed/handler chỉ phục vụ hai section này.
- **Rationale**: Đây là phần biểu hiện trực tiếp của feature cần loại bỏ. Giữ lại các computed như `assignedRows`, `selfAssignment`, hoặc search state sẽ tạo dead code và tiếp tục neo model hiện tại vào behavior cũ.
- **Alternative considered**: Chỉ ẩn UI nhưng giữ data/model. Phương án này bị loại vì vẫn để lại độ phức tạp trong code và persistence, không đạt mục tiêu cleanup triệt để.

### 2. Loại bỏ `memberNotes` khỏi current lineup contract nhưng chấp nhận field dư khi đọc snapshot cũ
- **Decision**: Xóa `memberNotes` khỏi current TypeScript types, serializer output, snapshot write path, và các update flow. Read path của snapshot phải tolerant với dữ liệu cũ còn chứa `memberNotes` và bỏ qua field này.
- **Rationale**: Đây là cách cân bằng giữa cleanup và backward compatibility. Contract mới trở nên gọn hơn, nhưng dữ liệu cũ không bị phá khi restore.
- **Alternative considered**: Giữ `memberNotes` trong internal model chỉ để tương thích. Phương án này làm kéo dài vòng đời của field đã bị deprecate và khiến cleanup không hoàn chỉnh.

### 3. Cleanup xuyên qua component boundary thay vì để prop thừa
- **Decision**: Xóa các props như `onMemberNoteChange` và `assignmentNote` khỏi component tree (`MainBoard`, `TeamCard`, `MemberSlot`) thay vì để unused props tồn tại.
- **Rationale**: Prop thừa làm component contract lệch với domain thật và che giấu dead feature. Việc xóa ngay giúp type errors lộ ra rõ ràng trong lúc implement và giảm chi phí bảo trì.
- **Alternative considered**: Để prop tồn tại tạm thời nhưng không dùng. Phương án này đơn giản khi sửa nhanh, nhưng không phù hợp với mục tiêu bỏ hẳn feature.

### 4. Cập nhật test/serialization theo output mới
- **Decision**: Các serializer tests và lineup persistence tests phải assert rằng output hiện tại không còn `memberNotes`, đồng thời có coverage cho việc đọc payload cũ có field này mà không fail.
- **Rationale**: Thay đổi này là breaking ở write contract, nên test phải khóa chặt cả new shape lẫn compatibility behavior.
- **Alternative considered**: Chỉ cập nhật snapshot output mà không thêm compatibility coverage. Phương án này có nguy cơ làm hỏng restore path âm thầm.

## Risks / Trade-offs

- **[Snapshot cũ chứa `memberNotes`]** → Mitigation: Giữ read path tolerant với extra field và thêm test restore từ legacy payload.
- **[Có flow backend/frontend ẩn còn phụ thuộc note editing]** → Mitigation: Cleanup từ type boundary vào trong; để TypeScript/test failures chỉ ra call sites chưa được gỡ.
- **[Breaking change ở payload/snapshot mới]** → Mitigation: Ghi rõ trong proposal/specs và cập nhật tests để khóa contract mới.
- **[Xóa quá rộng có thể ảnh hưởng lineup UX không liên quan]** → Mitigation: Giới hạn change vào assignment summary, note metadata, serializer contract, không chạm drag/drop hay team composition logic.

## Migration Plan

1. Gỡ assignment UI và logic liên quan trong frontend lineup screen.
2. Xóa `memberNotes` khỏi shared types và component props.
3. Xóa note/assignment field khỏi backend serializer và snapshot write path.
4. Điều chỉnh restore/read path để bỏ qua `memberNotes` trong legacy snapshot data.
5. Cập nhật hoặc bổ sung tests cho serializer, snapshot compatibility, và compile-time contracts.
6. Sau deploy, lineup mới lưu ra sẽ không còn `memberNotes`; snapshot cũ vẫn đọc được nhưng field này bị bỏ qua.

## Open Questions

- Snapshot restore hiện đang parse dữ liệu ở đâu và mức độ strict của validation hiện tại như thế nào?
- Có endpoint hoặc service update nào ngoài `MainBoard` đang ghi `memberNotes` không?
- Có test frontend/manual verification nào hiện đang phụ thuộc assignment list UI cần cập nhật không?
