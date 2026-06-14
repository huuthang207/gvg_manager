## 1. Frontend lineup cleanup

- [x] 1.1 Xóa toàn bộ assignment summary UI khỏi `frontend/src/features/lineup/MainBoard.tsx`, bao gồm `Phân công của bạn`, `Danh sách phân công`, search, counter, và note input.
- [x] 1.2 Xóa các state, computed values, handlers, imports, và props trong `MainBoard.tsx` chỉ phục vụ assignment display hoặc member note editing.
- [x] 1.3 Xóa `assignmentNote` và các props/call sites liên quan trong `frontend/src/features/lineup/TeamCard.tsx` và `frontend/src/features/lineup/MemberSlot.tsx`.

## 2. Data contract và backend persistence cleanup

- [x] 2.1 Xóa `memberNotes` khỏi shared lineup types ở frontend/API contract, bao gồm mọi team hoặc snapshot shape hiện hành.
- [x] 2.2 Xóa `memberNotes` khỏi backend lineup serializer, snapshot write path, và mọi flow update chỉ phục vụ note assignment.
- [x] 2.3 Điều chỉnh snapshot/read path để payload cũ còn chứa `memberNotes` vẫn restore được nhưng field này bị bỏ qua.

## 3. Verification và regression coverage

- [x] 3.1 Cập nhật serializer/snapshot tests để assert payload mới không còn `memberNotes`.
- [x] 3.2 Bổ sung hoặc cập nhật coverage cho legacy snapshot compatibility với dữ liệu cũ có `memberNotes`.
- [x] 3.3 Chạy verification phù hợp để xác nhận lineup screen vẫn hoạt động cho drag/drop, slot skill, snapshot actions, và restore flow sau khi cleanup.