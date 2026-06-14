## 1. Shared contracts và lineup data model cleanup

- [x] 1.1 Xóa `reserveMemberIds` khỏi shared lineup types và snapshot shapes ở frontend/API contract.
- [x] 1.2 Cập nhật attendance import payload để không còn lane reserve riêng hoặc dữ liệu `MAYBE`-to-reserve.
- [x] 1.3 Rà và cập nhật mọi serializer/payload typing ở backend còn giả định đội hình có `reserveMemberIds`.

## 2. Frontend lineup và attendance import cleanup

- [x] 2.1 Xóa reserve section, reserve counters, reserve slots, và reserve-related rendering khỏi `TeamCard.tsx`, `MemberSlot.tsx`, `SavedLineupsView.tsx`, và các UI lineup liên quan.
- [x] 2.2 Cập nhật `TeamLayout.tsx` và các helper drag/drop để chỉ còn main slot IDs, main slot movement, và một lane thành viên trong đội hình.
- [x] 2.3 Cập nhật `SquadSetupScreen.tsx`, `attendanceLineupImport.ts`, `MainBoard.tsx`, và attendance import modal để chỉ tạo/nhập lane thành viên chính; bỏ checkbox thêm người chưa điểm danh vào dự bị và các summary reserve.

## 3. Backend attendance và persistence cleanup

- [x] 3.1 Xóa lựa chọn `MAYBE` khỏi Discord attendance buttons, vote parsing, vote validation, và success labels trong attendance flow mới.
- [x] 3.2 Cập nhật attendance summary/render/service để không còn behavior reserve/standby trong flow mới nhưng vẫn đọc được dữ liệu lịch sử an toàn.
- [x] 3.3 Cập nhật lineup snapshot save/restore và serializer để snapshot mới không còn reserve data, trong khi snapshot cũ có reserve vẫn restore được bằng cách bỏ qua lane reserve.

## 4. Verification và compatibility coverage

- [x] 4.1 Cập nhật tests cho serializer/snapshot để assert payload mới không còn `reserveMemberIds` và legacy snapshot reserve data vẫn được đọc an toàn.
- [x] 4.2 Cập nhật tests/coverage cho attendance flow để assert không còn `MAYBE` trong buttons, parsing, summary mới, và import behavior.
- [x] 4.3 Chạy verification phù hợp cho frontend/backend để xác nhận lineup, attendance, import, snapshot, và legacy compatibility vẫn hoạt động sau cleanup.