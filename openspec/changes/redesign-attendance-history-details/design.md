## Context

Hiện tại modal **Chi tiết lịch sử điểm danh** sử dụng `SessionDetailsPanel` để render ba phần chính: `ClassSummary`, toolbar lọc, và hai khối nội dung `VoteTable` + `NotVotedTable`. Cấu trúc này tận dụng tốt dữ liệu sẵn có từ `AttendanceSession` và `Member`, nhưng hierarchy hiển thị còn phẳng: summary theo class xuất hiện trước summary theo trạng thái phản hồi, bảng vote mang cảm giác nặng và danh sách chưa điểm danh chưa được ưu tiên đúng mức trong flow review của người quản lý bang.

Thay đổi này chỉ tác động đến frontend attendance UI, chủ yếu trong `frontend/src/features/attendance/AttendanceView.tsx` và có thể cần tách thêm một số presentational subcomponents trong cùng thư mục. Không có thay đổi về API contract, database hay Discord bot flow. Ràng buộc chính là phải giữ nguyên dữ liệu hiện có (`GO`, `NOGO`, vote timestamps, snapshot class/name, active members) và cải thiện cách tổ chức/trình bày thông tin mà không phụ thuộc backend mới.

## Goals / Non-Goals

**Goals:**
- Tạo hierarchy rõ ràng cho modal lịch sử: header ngữ cảnh → summary nhanh → filter/toolbar → danh sách chi tiết.
- Giúp người dùng nắm nhanh số người `GO`, `NOGO`, `chưa điểm danh`, tổng số active members và tiến độ phản hồi.
- Làm phần chi tiết dễ scan hơn trên desktop và mobile, đặc biệt khi xem lịch sử một phiên đã đóng.
- Giữ nguyên behavior lọc/tìm kiếm theo choice, class và tên; chỉ thay đổi cách tổ chức và biểu đạt UI.
- Tận dụng dữ liệu sẵn có để tách rõ hai nhóm cần review: người đã điểm danh và người chưa điểm danh.

**Non-Goals:**
- Không thay đổi attendance API, shape của `AttendanceSession`, hoặc cách backend tính summary.
- Không thêm loại vote mới, không thay đổi flow mở/đóng phiên điểm danh.
- Không redesign toàn bộ màn hình AttendanceView ngoài phạm vi modal chi tiết lịch sử.
- Không thêm analytics, export hoặc thao tác bulk mới trong modal chi tiết lịch sử.

## Decisions

### 1. Chuyển modal sang cấu trúc summary-first
**Decision:** Modal chi tiết lịch sử sẽ hiển thị phần summary phản hồi trước, sau đó mới đến cơ cấu phái và danh sách chi tiết.

**Rationale:** Trong lịch sử điểm danh, câu hỏi quan trọng nhất là “bao nhiêu người đi / không đi / chưa trả lời”. `ClassSummary` hiện đứng đầu khiến user phải suy luận ngược từ distribution sang trạng thái phản hồi. Summary-first làm modal phù hợp hơn với mental model quản lý phiên attendance.

**Alternatives considered:**
- Giữ `ClassSummary` ở đầu như hiện tại: ít thay đổi code nhưng không giải quyết được vấn đề hierarchy.
- Chỉ thêm vài badge số lượng ở header: cải thiện nhẹ nhưng chưa đủ để tách lớp thông tin.

### 2. Tách nội dung chi tiết thành các vùng review rõ ràng
**Decision:** Phần chi tiết sẽ được tổ chức thành hai vùng chính: danh sách đã điểm danh và danh sách chưa điểm danh, với cách trình bày giúp scan nhanh hơn thay vì đặt hai bảng cạnh nhau như hiện tại.

**Rationale:** `NotVotedTable` là nhóm dữ liệu quan trọng nhưng hiện bị đẩy về panel phụ ở cạnh phải. Việc tách vùng review rõ ràng giúp user hiểu đây là hai tập thông tin khác nhau và tránh cảm giác bố cục bị chia cột cơ học.

**Alternatives considered:**
- Giữ layout 2 cột hiện tại và chỉ tăng spacing: đơn giản nhưng chưa giải quyết việc nhóm “chưa điểm danh” bị lép vế.
- Gộp tất cả thành một bảng có filter trạng thái: tiết kiệm component nhưng làm việc scan trạng thái khó hơn.

### 3. Giữ nguyên logic filter, thay đổi cách trình bày toolbar
**Decision:** Search, choice filter và class filter vẫn giữ nguyên logic hiện tại, nhưng được đặt trong một toolbar gọn và nhất quán hơn với summary area.

**Rationale:** Logic lọc hiện tại đã đủ dùng và không yêu cầu backend mới. Giá trị của redesign nằm ở visual organization hơn là thay đổi behavior. Giữ logic cũ giúp giảm risk khi implement.

**Alternatives considered:**
- Bỏ bớt filter để UI tối giản hơn: gọn hơn nhưng làm giảm utility cho session có nhiều vote.
- Thêm quick filter mới như segmented control cho `GO`/`NOGO`: có thể hữu ích nhưng không bắt buộc trong phase đầu.

### 4. Ưu tiên presentation component thay vì thay đổi domain logic
**Decision:** Implementation nên ưu tiên refactor `SessionDetailsPanel` thành các UI subcomponents nhỏ (ví dụ summary cards, toolbar, vote list, not-voted list) trong cùng feature folder nếu cần, thay vì thay đổi data derivation.

**Rationale:** Dữ liệu đầu vào hiện đã đầy đủ. Tách component giúp implementation dễ review, giảm độ dài của `AttendanceView.tsx`, và cho phép tinh chỉnh layout/mobile behavior mà không đụng vào flow attendance khác.

**Alternatives considered:**
- Giữ toàn bộ code trong `AttendanceView.tsx`: nhanh hơn lúc sửa đầu tiên nhưng khó đọc và khó lặp lại nếu còn tinh chỉnh UI sau đó.
- Tạo design system component mới ở shared layer: quá rộng so với scope thay đổi này.

## Risks / Trade-offs

- **[Risk]** Redesign mạnh trong cùng một file lớn có thể làm `AttendanceView.tsx` khó maintain hơn nếu không tách component. → **Mitigation:** Ưu tiên tách phần modal detail thành subcomponents rõ nghĩa.
- **[Risk]** Chuyển từ table-heavy layout sang list/card layout có thể làm mất cảm giác “data dense” với session nhiều vote. → **Mitigation:** Giữ thông tin quan trọng trên từng item đủ cô đọng và đảm bảo scroll performance ổn.
- **[Risk]** Responsive behavior của modal có thể bị ảnh hưởng nếu thêm quá nhiều section summary. → **Mitigation:** Thiết kế theo thứ bậc co giãn, summary cards xuống hàng hợp lý trên màn nhỏ.
- **[Risk]** Cơ cấu phái có thể gây nhiễu nếu tiếp tục quá nổi bật so với summary phản hồi. → **Mitigation:** Giữ class breakdown như section phụ, không chiếm vị trí ưu tiên cao nhất.
