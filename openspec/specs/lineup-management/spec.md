## Purpose

Quy định behavior quản lý, hiển thị, lưu và khôi phục đội hình GvG mà không bao gồm assignment summary UI hoặc member note metadata.

## Requirements

### Requirement: Lineup screen excludes assignment summary features
Màn hình lineup SHALL chỉ hỗ trợ việc hiển thị và thao tác đội hình, không bao gồm assignment summary panel hoặc assignment list panel.

#### Scenario: User opens lineup screen
- **WHEN** người dùng mở màn hình lineup
- **THEN** hệ thống SHALL NOT hiển thị khu vực `Phân công của bạn`
- **THEN** hệ thống SHALL NOT hiển thị khu vực `Danh sách phân công`

#### Scenario: User views lineup controls
- **WHEN** màn hình lineup render các action và board hiện tại
- **THEN** hệ thống SHALL tiếp tục hiển thị lineup board, team card, slot skill, snapshot actions, và lineup actions hiện có
- **THEN** hệ thống SHALL NOT cung cấp search, counter, bảng liệt kê, hoặc note input dành cho assignment summary
- **THEN** hệ thống SHALL NOT hiển thị reserve section, reserve counter, hoặc reserve slots trong mỗi team card

#### Scenario: Lineup screen uses a single member lane
- **WHEN** hệ thống render hoặc thao tác đội hình hiện hành
- **THEN** mỗi team SHALL chỉ có một lane thành viên chính
- **THEN** hệ thống SHALL NOT phụ thuộc `reserveMemberIds` trong model hiện hành

#### Scenario: Drag and drop lineup members
- **WHEN** người dùng kéo thả thành viên trong màn hình lineup
- **THEN** hệ thống SHALL chỉ resolve main slot IDs và main slot movement
- **THEN** hệ thống SHALL NOT hỗ trợ reserve slot IDs hoặc reserve slot movement

#### Scenario: Create a new lineup
- **WHEN** người dùng khởi tạo đội hình mới
- **THEN** hệ thống SHALL chỉ tạo các main slots cho mỗi team
- **THEN** hệ thống SHALL NOT tạo reserve slots trong model mới

#### Scenario: Import attendance into lineup
- **WHEN** hệ thống nhập danh sách attendance vào lineup
- **THEN** hệ thống SHALL chỉ gán thành viên vào các slot chính còn trống
- **THEN** hệ thống SHALL NOT tạo reserve import path

#### Scenario: Saved lineup overview renders
- **WHEN** người dùng xem saved lineup summary hoặc snapshot detail
- **THEN** hệ thống SHALL NOT hiển thị reserve counts hoặc reserve sections

#### Scenario: Select eligible lineup members from attendance source
- **WHEN** người dùng chọn nguồn thành viên từ attendance
- **THEN** hệ thống SHALL chỉ đưa các member có vote `GO` vào lane chờ xếp
- **THEN** hệ thống SHALL NOT thêm người chưa điểm danh hoặc reserve lane vào danh sách chờ xếp

#### Scenario: Rearrange lineup members
- **WHEN** người dùng chạy hành động sắp xếp lại đội hình
- **THEN** hệ thống SHALL chỉ xóa lane thành viên chính và reset slot skills
- **THEN** hệ thống SHALL NOT cần reset reserve lane trong model mới

#### Scenario: Collect leader candidates from current lineup
- **WHEN** hệ thống xây danh sách leader có thể chọn cho một đoàn
- **THEN** hệ thống SHALL chỉ lấy thành viên từ lane chính hiện hành
- **THEN** hệ thống SHALL NOT phụ thuộc dữ liệu reserve lane

#### Scenario: Empty lineup preserves saved snapshot access
- **WHEN** người dùng chưa có đội hình hiện tại nhưng vẫn mở flow lineup
- **THEN** hệ thống SHALL tiếp tục cho phép xem lại saved lineups
- **THEN** flow này SHALL không phụ thuộc reserve data

#### Scenario: Persist current lineup state
- **WHEN** hệ thống lưu squad layout hiện hành
- **THEN** payload lưu trữ SHALL chỉ chứa lane thành viên chính và dữ liệu skill liên quan
- **THEN** payload SHALL NOT chứa reserve member state

#### Scenario: Attendance import feedback is shown
- **WHEN** người dùng import attendance vào lineup thành công hoặc không có slot trống
- **THEN** hệ thống SHALL thông báo số thành viên đã nhập, số người đã có trong đội hình, và số người vượt quá slot trống
- **THEN** thông báo SHALL NOT nhắc tới lane dự bị

#### Scenario: Member pool attendance source UI renders
- **WHEN** member pool đang ở chế độ source từ attendance
- **THEN** hệ thống SHALL chỉ cho phép chọn attendance session để lấy danh sách `GO`
- **THEN** hệ thống SHALL NOT hiển thị checkbox thêm người chưa điểm danh

#### Scenario: Main board summary renders
- **WHEN** main lineup board render summary và statistics
- **THEN** các thống kê SHALL phản ánh mô hình chỉ có lane thành viên chính
- **THEN** giao diện SHALL NOT hiển thị reserve-specific summary

#### Scenario: Team card renders a team
- **WHEN** một team card được render trong lineup hoặc snapshot view
- **THEN** team card SHALL chỉ hiển thị main slots
- **THEN** team card SHALL NOT render reserve subsection

#### Scenario: Member slot renders an empty position
- **WHEN** một main slot không có member
- **THEN** member slot SHALL dùng empty-state cho lane chính duy nhất
- **THEN** component SHALL NOT dùng branch style dành cho reserve slot

#### Scenario: Saved lineup snapshot detail renders teams
- **WHEN** người dùng mở chi tiết một saved lineup snapshot
- **THEN** snapshot view SHALL render teams theo mô hình một lane thành viên
- **THEN** snapshot view SHALL NOT hiển thị hoặc tính toán reserve members

#### Scenario: Squad setup screen creates initial teams
- **WHEN** người dùng tạo đội hình ban đầu từ màn hình setup
- **THEN** mỗi team mới SHALL chỉ chứa mảng `memberIds`
- **THEN** màn hình setup SHALL NOT tạo `reserveMemberIds`

#### Scenario: Snapshot skill mapping is serialized
- **WHEN** hệ thống serialize snapshot skill data
- **THEN** hệ thống SHALL chỉ ghi skill mapping cho `main-*` slots
- **THEN** hệ thống SHALL NOT ghi `reserve-*` skill mapping trong contract mới

#### Scenario: Serialize division data
- **WHEN** hệ thống serialize divisions từ team slots
- **THEN** output SHALL chỉ chứa lane thành viên chính cho mỗi team
- **THEN** output SHALL NOT chứa reserve lane trong contract mới

#### Scenario: Restore snapshot created before reserve removal
- **WHEN** hệ thống đọc snapshot cũ có dữ liệu reserve slot
- **THEN** hệ thống SHALL bỏ qua reserve lane nhưng vẫn phục hồi lane chính và skill data hợp lệ
- **THEN** restore SHALL không fail chỉ vì snapshot còn reserve information

#### Scenario: Persist squad layout route validates payload
- **WHEN** backend nhận payload squad layout mới
- **THEN** route typing và persistence flow SHALL chỉ chấp nhận lane thành viên chính
- **THEN** route SHALL NOT yêu cầu `reserveMemberIds` trong contract mới

#### Scenario: Collect assigned member ids
- **WHEN** hệ thống gom danh sách member đã được xếp đội
- **THEN** hệ thống SHALL chỉ thu thập từ lane thành viên chính
- **THEN** helper này SHALL NOT phụ thuộc reserve lane

#### Scenario: Member pool unassigned counts render
- **WHEN** member pool hiển thị số lượng member chưa xếp
- **THEN** phép tính SHALL dựa trên lane thành viên chính duy nhất
- **THEN** giao diện SHALL không còn logic reserve ảnh hưởng tới số liệu này

#### Scenario: Attendance source session detail is selected
- **WHEN** người dùng chọn một attendance session để làm source member pool hoặc import
- **THEN** hệ thống SHALL chỉ coi `GO` là thành viên hợp lệ cho lineup flow mới
- **THEN** session detail selection SHALL NOT tái tạo reserve semantics

#### Scenario: Skill assignment via drag and drop
- **WHEN** người dùng kéo skill vào một member trong lineup
- **THEN** hệ thống SHALL resolve skill assignment qua main slot hoặc member target hiện hành
- **THEN** hệ thống SHALL NOT phụ thuộc reserve slot lookup

#### Scenario: Start a new empty lineup from existing state
- **WHEN** người dùng xóa trắng đội hình hiện tại để tạo lại từ đầu
- **THEN** hệ thống SHALL xóa lane thành viên chính hiện hành và clear skills tương ứng
- **THEN** flow này SHALL không còn yêu cầu xử lý reserve members

#### Scenario: Saved lineup summary counts members
- **WHEN** hệ thống tính số lượng thành viên trong saved lineup summary
- **THEN** số liệu SHALL chỉ dựa trên lane thành viên chính
- **THEN** summary SHALL không còn field reserve count trong contract mới

#### Scenario: Snapshot data shape is exposed to frontend
- **WHEN** frontend nhận dữ liệu snapshot hoặc squadGroups từ backend
- **THEN** shape exposed hiện hành SHALL không chứa `reserveMemberIds`
- **THEN** các component đọc dữ liệu này SHALL hoạt động với contract một lane

#### Scenario: Attendance source member visibility is computed
- **WHEN** hệ thống tính danh sách member hiển thị từ attendance source trong lineup workspace
- **THEN** visibility SHALL được tính từ các vote `GO`
- **THEN** người chưa điểm danh hoặc vote khác SHALL không được thêm theo reserve-style behavior

#### Scenario: Drop member back to pool
- **WHEN** người dùng kéo một member từ lineup trở lại member pool
- **THEN** hệ thống SHALL gỡ member khỏi lane chính và clear skills gắn trên member đó
- **THEN** flow này SHALL không cần xử lý reserve lane

#### Scenario: Replace a member in an occupied main slot
- **WHEN** người dùng thả một member mới vào một main slot đang có người khác
- **THEN** hệ thống SHALL thay thế occupant cũ trong lane chính và clear skills của occupant bị thay
- **THEN** flow này SHALL không cần fallback sang reserve lane

#### Scenario: Restore saved snapshot into empty lineup state
- **WHEN** người dùng restore một snapshot vào trạng thái không có đội hình hiện tại
- **THEN** hệ thống SHALL phục hồi lane chính và skill data hợp lệ của snapshot đó
- **THEN** snapshot restore SHALL không tái tạo reserve lane trong model mới

#### Scenario: Team card occupancy badge renders
- **WHEN** một team card hiển thị badge số lượng thành viên
- **THEN** badge SHALL chỉ phản ánh `memberIds` hiện hành trên lane chính
- **THEN** badge SHALL không cộng reserve counts

#### Scenario: Main board leader selection options render
- **WHEN** main board render danh sách chọn leader đoàn
- **THEN** danh sách option SHALL được suy ra từ lane thành viên chính hiện hành
- **THEN** option generation SHALL không còn đọc reserve members

#### Scenario: Import attendance result is persisted
- **WHEN** người dùng import attendance và hệ thống lưu lại squad layout
- **THEN** persistence flow SHALL chỉ ghi lane thành viên chính sau import
- **THEN** không có reserve-specific persistence branch nào được dùng

#### Scenario: Snapshot overview cards render counts
- **WHEN** danh sách saved snapshots hiển thị overview cards
- **THEN** team/member counts SHALL vẫn render đúng theo contract mới không có reserve lane
- **THEN** UI SHALL không trình bày reserve-specific metadata

#### Scenario: Member visibility from guild source remains unchanged
- **WHEN** người dùng dùng source member pool từ guild
- **THEN** member pool SHALL tiếp tục hiển thị member chưa xếp từ guild như trước
- **THEN** thay đổi remove reserve SHALL không làm phát sinh reserve-specific behavior trong guild source

#### Scenario: Restore legacy snapshot with duplicate reserve member ids
- **WHEN** snapshot cũ có duplicate member ids nằm ở reserve lane hoặc trùng với lane chính
- **THEN** hệ thống SHALL bỏ qua reserve lane và dedupe theo lane chính hiện hành
- **THEN** restore SHALL không crash vì duplicate legacy reserve entries

#### Scenario: Serialize squad group for app state
- **WHEN** backend trả squadGroups trong app state hiện hành
- **THEN** mỗi team SHALL chỉ chứa `memberIds` và `slotSkills` hợp lệ
- **THEN** app state SHALL NOT expose reserve lane trong contract mới

#### Scenario: Attendance import modal action button renders
- **WHEN** modal nhập attendance render nút xác nhận import
- **THEN** label nút SHALL phản ánh số member lane chính sẽ được nhập
- **THEN** label SHALL không nhắc tới reserve count

#### Scenario: Member pool attendance source helper renders session option
- **WHEN** member pool render dropdown session attendance source
- **THEN** session labels có thể hiển thị thông tin attendance summary hiện hành nhưng SHALL NOT hiển thị reserve-specific value
- **THEN** dropdown logic SHALL vẫn cho phép chọn session để lấy danh sách `GO`

#### Scenario: App state loader applies squadGroups contract
- **WHEN** frontend load app state từ backend
- **THEN** các hook và component liên quan tới lineup SHALL chấp nhận shape không có `reserveMemberIds`
- **THEN** app state application SHALL không giả định tồn tại reserve lane

#### Scenario: Lineup workspace reset helper clears assigned skills
- **WHEN** helper reset lineup xác định member cần clear skills
- **THEN** helper SHALL chỉ xét member thực sự được xếp trong lane chính hiện hành
- **THEN** reserve lane legacy data SHALL không ảnh hưởng tới skill clearing flow

#### Scenario: Snapshot save modal preserves simplified contract
- **WHEN** người dùng lưu hoặc ghi đè snapshot từ lineup hiện hành
- **THEN** snapshot save flow SHALL hoạt động với contract chỉ có lane chính
- **THEN** contract mới SHALL không tái sinh reserve metadata trong saved snapshot

#### Scenario: Snapshot detail team rendering preserves skill display
- **WHEN** snapshot detail render các team đã lưu
- **THEN** system SHALL vẫn hiển thị skill mapping hợp lệ cho `main-*` slots
- **THEN** việc bỏ reserve lane SHALL không làm mất skill display cho lane chính

#### Scenario: TeamLayout attendance source state is cleared
- **WHEN** hệ thống reset lineup workspace UI state
- **THEN** attendance source session selection SHALL được reset về trạng thái mặc định
- **THEN** reserve/not-voted UI state cũ SHALL không còn tồn tại trong flow mới

#### Scenario: Lineup import source switching remains functional
- **WHEN** người dùng đổi source member pool giữa `guild` và `attendance`
- **THEN** source switching SHALL vẫn hoạt động trong mô hình một lane thành viên
- **THEN** UI SHALL không tái xuất hiện reserve-specific options khi đổi source

#### Scenario: Main slot empty placeholder renders
- **WHEN** một slot chính đang trống trên team card
- **THEN** placeholder visual SHALL hiển thị đúng cho lane chính duy nhất
- **THEN** component SHALL không còn nhánh empty-state riêng cho reserve slot

#### Scenario: TeamLayout drag origin from slot is validated
- **WHEN** member được kéo từ một slot hiện có trong lineup
- **THEN** hệ thống SHALL chỉ coi origin hợp lệ nếu đó là main slot ID hiện hành
- **THEN** drag origin validation SHALL không còn phụ thuộc reserve IDs

#### Scenario: Restore snapshot with legacy reserve skill mapping
- **WHEN** snapshot cũ chứa `reserve-*` skill mapping
- **THEN** restore SHALL bỏ qua reserve skill entries nhưng vẫn giữ `main-*` entries hợp lệ
- **THEN** legacy reserve skill mapping SHALL không làm hỏng flow restore

#### Scenario: Team statistics in saved snapshot card remain coherent
- **WHEN** người dùng mở saved lineup detail
- **THEN** số liệu tổng hợp thành viên SHALL khớp với contract chỉ có lane chính
- **THEN** UI SHALL không tạo ra chênh lệch count do reserve lane bị loại bỏ

#### Scenario: Attendance import helper returns simplified result
- **WHEN** helper import attendance hoàn tất xử lý
- **THEN** result object SHALL báo số member đã nhập, số trùng, và số overflow cho lane chính
- **THEN** result SHALL không còn field importedReserveCount trong contract mới

#### Scenario: Persisted lineup input shape is simplified
- **WHEN** backend nhận dữ liệu squadGroups để persist
- **THEN** kiểu `PersistedSquadGroupInput` SHALL chỉ cần `memberIds` cho mỗi team
- **THEN** kiểu input này SHALL không còn `reserveMemberIds` trong contract mới

#### Scenario: Duplicate snapshot member filtering uses simplified model
- **WHEN** backend lọc duplicate members trong snapshot restore
- **THEN** dedupe logic SHALL chỉ tác động lên lane thành viên chính hiện hành
- **THEN** reserve lane legacy data SHALL không được tái đưa vào model mới

#### Scenario: Collect snapshot member skills uses simplified model
- **WHEN** backend gom `skillsByMemberId` từ snapshot data
- **THEN** helper SHALL chỉ đọc `main-*` slots trong contract mới
- **THEN** reserve lane legacy data SHALL bị bỏ qua an toàn

#### Scenario: Create empty team contract for lineup setup
- **WHEN** frontend tạo contract trống cho một team mới
- **THEN** team object SHALL chỉ khởi tạo `memberIds` và các field còn được hỗ trợ
- **THEN** contract trống SHALL không có `reserveMemberIds`

#### Scenario: Member assignment summary remains absent after reserve removal
- **WHEN** hệ thống render lineup sau khi reserve lane bị loại bỏ
- **THEN** các UI assignment summary đã bị gỡ trước đó SHALL vẫn không xuất hiện
- **THEN** reserve removal SHALL không tái giới thiệu các thành phần assignment summary

#### Scenario: TeamLayout import success banner remains coherent
- **WHEN** attendance import hoàn tất
- **THEN** banner/thông báo kết quả SHALL dùng ngôn ngữ một lane thành viên
- **THEN** nội dung thông báo SHALL không còn cụm `chính / dự bị`

#### Scenario: Attendance source member pool still supports search and class filter
- **WHEN** người dùng dùng member pool từ attendance source
- **THEN** search và class filter SHALL vẫn hoạt động trên danh sách `GO` chưa được xếp
- **THEN** không có reserve/not-voted branch nào ảnh hưởng tới filter behavior

#### Scenario: Member returned from occupied slot to pool remains unassigned
- **WHEN** một member bị thay thế khỏi slot chính hoặc bị kéo về pool
- **THEN** member đó SHALL trở về trạng thái unassigned trong member pool
- **THEN** flow này SHALL không còn nhánh reserve fallback

#### Scenario: Snapshot detail grid rendering remains valid
- **WHEN** snapshot detail render grid các team trong một group
- **THEN** layout grid SHALL tiếp tục hoạt động với team card đã được đơn giản hóa
- **THEN** việc bỏ reserve subsection SHALL không làm vỡ grid rendering

#### Scenario: Team badge still reflects lineup capacity
- **WHEN** team card hiển thị badge dung lượng team
- **THEN** badge SHALL tiếp tục phản ánh số member đã xếp trên tổng số main slots
- **THEN** reserve lane removal SHALL không làm badge mất ý nghĩa

#### Scenario: Lineup workspace active tab update after import
- **WHEN** attendance import hoàn tất
- **THEN** workspace SHALL vẫn chuyển sang tab đội hình phù hợp như trước
- **THEN** việc bỏ reserve lane SHALL không phá hành vi điều hướng sau import

#### Scenario: Restore snapshot preserves leader selection
- **WHEN** người dùng restore một snapshot cũ hoặc mới
- **THEN** `leaderMemberId` hợp lệ SHALL vẫn được phục hồi nếu member còn trong lane chính
- **THEN** reserve lane removal SHALL không làm mất leader restoration của lane chính

#### Scenario: Main board export image still functions
- **WHEN** người dùng tải ảnh lineup hiện tại
- **THEN** ảnh export SHALL phản ánh team cards đã bỏ reserve subsection
- **THEN** flow export image SHALL không phụ thuộc dữ liệu reserve

#### Scenario: Main board class stats remain valid
- **WHEN** main board tính class stats của lineup hiện hành
- **THEN** số liệu SHALL dựa trên member hiện được xếp trong lane chính
- **THEN** reserve lane removal SHALL không làm class stats đếm dư hoặc thiếu

#### Scenario: Attendance import modal summary remains meaningful
- **WHEN** người dùng xem modal nhập attendance
- **THEN** summary card SHALL phản ánh rõ số member sẽ được nhập và số người không tham gia
- **THEN** summary SHALL không còn hiển thị reserve-related metrics

#### Scenario: Lineup source attendance session preview remains valid
- **WHEN** member pool hiển thị session attendance source preview
- **THEN** preview text SHALL vẫn hữu ích cho việc chọn source `GO`
- **THEN** preview SHALL không còn tham chiếu tới reserve semantics

#### Scenario: Saved snapshot overview still reports team counts
- **WHEN** danh sách saved snapshots hiển thị overview item
- **THEN** `teamCount` và `groupCount` SHALL tiếp tục hiển thị đúng
- **THEN** loại bỏ reserve lane SHALL không ảnh hưởng tới các count structural này

#### Scenario: Skill assignment removal from reset remains intact
- **WHEN** người dùng reset hoặc tạo mới lineup
- **THEN** assigned skills của member đang nằm trong lane chính SHALL vẫn được clear đúng như trước
- **THEN** flow clear skills SHALL không còn cần xét reserve lane

#### Scenario: Import attendance helper skips already assigned members
- **WHEN** payload import chứa member đã được xếp ở lane chính
- **THEN** helper SHALL tăng `skippedAlreadyAssignedCount`
- **THEN** helper SHALL không dùng reserve lane như fallback để tránh skip

#### Scenario: Import attendance helper reports overflow correctly
- **WHEN** không còn slot chính trống cho một số member trong payload import
- **THEN** helper SHALL tăng `overflowCount`
- **THEN** helper SHALL không chuyển overflow members sang reserve lane

#### Scenario: Member pool attendance source dropdown works without not-voted toggle
- **WHEN** người dùng chọn source từ attendance trong member pool
- **THEN** dropdown chọn session SHALL vẫn hoạt động độc lập
- **THEN** UI SHALL không còn toggle not-voted kèm theo source attendance

#### Scenario: Legacy snapshot reserve members do not appear in current team cards
- **WHEN** một snapshot cũ có reserve members được restore hoặc xem detail
- **THEN** reserve members SHALL không xuất hiện như một subsection hiện hành trong team card mới
- **THEN** team card SHALL chỉ render lane chính dù snapshot gốc từng có reserve lane

#### Scenario: Persisted squad layout clears unused teams safely
- **WHEN** backend persist một layout mới không còn reserve lane
- **THEN** stale teams và slot data SHALL vẫn được xử lý an toàn theo flow hiện tại
- **THEN** loại bỏ reserve lane SHALL không làm persistence flow bỏ sót cleanup structural

#### Scenario: Attendance import source uses selected session detail
- **WHEN** người dùng chọn một attendance session để import
- **THEN** hệ thống SHALL dùng detail của session đó để lấy danh sách `GO`
- **THEN** session detail parsing SHALL không còn đọc `MAYBE` như nguồn lineup member

#### Scenario: Empty lineup menu remains available after reserve removal
- **WHEN** không có đội hình hiện tại và người dùng vào flow lineup
- **THEN** menu tạo mới / dùng saved lineup SHALL vẫn hiển thị bình thường
- **THEN** reserve lane removal SHALL không ảnh hưởng tới empty-lineup entry flow

#### Scenario: Member pool count badge remains accurate
- **WHEN** member pool render badge số lượng member chờ xếp
- **THEN** badge SHALL phản ánh đúng số member chưa xếp ở lane chính
- **THEN** reserve lane removal SHALL không làm badge đếm theo lane cũ

#### Scenario: Team card slot IDs remain stable under simplified model
- **WHEN** team card render các slots chính
- **THEN** slot IDs SHALL tiếp tục theo format main slot hiện hành (`-slot-`)
- **THEN** simplified model SHALL không phát sinh format reserve ID mới

#### Scenario: Snapshot summary in app state remains stable
- **WHEN** app state trả dữ liệu snapshot hoặc squadGroups sau cleanup
- **THEN** frontend consuming code SHALL nhận shape ổn định phù hợp với main lane only
- **THEN** contract này SHALL nhất quán giữa live lineup và saved lineup

#### Scenario: Restore snapshot keeps valid skill assignments for main members
- **WHEN** một snapshot có skill assignments hợp lệ trên lane chính được restore
- **THEN** các skill đó SHALL vẫn được áp dụng cho đúng member lane chính
- **THEN** reserve lane removal SHALL không làm mất khôi phục skill của lane chính

#### Scenario: Attendance import helper copies only supported team fields
- **WHEN** helper tạo `nextGroups` từ lineup hiện có trước khi import
- **THEN** helper SHALL chỉ copy các field còn được hỗ trợ trong contract team mới
- **THEN** helper SHALL không tái tạo `reserveMemberIds` trong object clone

#### Scenario: Main lineup source session visibility reacts to session changes
- **WHEN** người dùng đổi sang attendance session khác trong member pool
- **THEN** danh sách member chờ xếp SHALL cập nhật theo `GO` votes của session mới
- **THEN** thay đổi session SHALL không còn tác động tới reserve/not-voted branches

#### Scenario: Team reset preserves team/group structure
- **WHEN** người dùng chạy `Sắp xếp lại`
- **THEN** hệ thống SHALL giữ nguyên cấu trúc đoàn/đội và chỉ clear các main slots
- **THEN** reset SHALL không phụ thuộc reserve lane để bảo toàn structure

#### Scenario: New lineup contract remains compatible with skill UI
- **WHEN** member đã được xếp ở lane chính có assigned skills
- **THEN** skill UI SHALL tiếp tục hiển thị và cho phép gỡ skill như trước
- **THEN** reserve lane removal SHALL không làm mất feature skill của lane chính

#### Scenario: Snapshot save/overwrite flow remains available
- **WHEN** người dùng lưu mới hoặc overwrite snapshot hiện tại
- **THEN** action flow SHALL tiếp tục hoạt động với contract đã đơn giản hóa
- **THEN** reserve lane removal SHALL không làm mất các controls save/overwrite snapshot

#### Scenario: Leader candidate dedupe remains stable
- **WHEN** hệ thống xây danh sách option leader từ main lane
- **THEN** mỗi member SHALL chỉ xuất hiện một lần trong dropdown leader
- **THEN** việc bỏ reserve lane SHALL không làm mất behavior dedupe hiện có

#### Scenario: Remove reserve from lineup domain does not affect empty skill pool drop handling
- **WHEN** người dùng kéo skill về skill pool hoặc thao tác skill pool khác
- **THEN** behavior skill pool hiện hành SHALL vẫn hoạt động bình thường
- **THEN** reserve lane removal SHALL không làm thay đổi semantics của skill pool

#### Scenario: Persisted app state no longer requires reserve fields in consumers
- **WHEN** các hook/frontend consumer đọc `squadGroups` từ app state
- **THEN** chúng SHALL compile và chạy với shape không có reserve field
- **THEN** consumer code SHALL không cần defensive handling cho reserve lane hiện hành

#### Scenario: Attendance import modal no longer presents reserve terminology
- **WHEN** người dùng tương tác với modal nhập attendance
- **THEN** copy và labels trong modal SHALL chỉ dùng terminology tương ứng với lane thành viên chính
- **THEN** modal SHALL không còn nhắc tới `dự bị`

#### Scenario: Main lineup board still exposes attendance import entrypoint
- **WHEN** người dùng có quyền quản lý lineup
- **THEN** main board hoặc lineup flow SHALL vẫn cho phép mở modal import attendance như trước
- **THEN** entrypoint này SHALL hoạt động với model một lane thành viên

#### Scenario: Simplified lineup contract propagates to snapshot detail type
- **WHEN** frontend hoặc backend làm việc với `LineupSnapshotDetail`
- **THEN** team shape bên trong detail SHALL không còn `reserveMemberIds`
- **THEN** mọi consumer của snapshot detail SHALL tuân theo contract mới

#### Scenario: Member pool guild source remains unaffected by attendance cleanup
- **WHEN** source member pool là `guild`
- **THEN** danh sách member chưa xếp từ guild SHALL hoạt động như trước
- **THEN** thay đổi attendance/GO-only semantics SHALL không làm ảnh hưởng source guild

#### Scenario: Slot parsing rejects legacy reserve slot ids in current model
- **WHEN** code hiện hành nhận một slot id không thuộc format `-slot-`
- **THEN** parser SHALL coi đó là invalid cho model hiện tại
- **THEN** legacy reserve slot IDs SHALL không được xử lý như slot hợp lệ trong runtime mới

#### Scenario: Import attendance count card remains coherent after cleanup
- **WHEN** modal nhập attendance hiển thị card thống kê
- **THEN** card SHALL chỉ tập trung vào lane nhập hợp lệ và trạng thái không tham gia
- **THEN** card SHALL không còn metric `Dự bị`

#### Scenario: Snapshot serializer test contract reflects simplified model
- **WHEN** serializer test fixtures mô phỏng slots có cả dữ liệu reserve cũ
- **THEN** assertions SHALL xác nhận reserve lane bị bỏ qua trong output contract mới
- **THEN** test suite SHALL bảo vệ behavior compatibility này về sau

#### Scenario: Attendance UI history rows reflect two-state model
- **WHEN** lịch sử attendance render summary pills hoặc summary cards
- **THEN** UI SHALL chỉ hiển thị `GO` và `NOGO` trong flow hiện hành
- **THEN** history row rendering SHALL không còn pill `MAYBE`

#### Scenario: GvG participation helper selection from attendance remains available
- **WHEN** người dùng chọn auto-fill participation từ attendance
- **THEN** helper SHALL vẫn hỗ trợ chọn nhóm `GO` từ session attendance
- **THEN** giao diện SHALL không còn nút/tùy chọn `Dự bị`

#### Scenario: Restore snapshot into simplified frontend state remains type-safe
- **WHEN** frontend nhận state sau hành động restore snapshot
- **THEN** state này SHALL phù hợp với type contract không có reserve lane
- **THEN** các component sau restore SHALL không cần fallback reserve handling

#### Scenario: Member pool attendance source search results remain stable
- **WHEN** người dùng search trong member pool khi source là attendance
- **THEN** kết quả SHALL chỉ lọc trên tập `GO` đang visible
- **THEN** cleanup reserve/standby SHALL không làm search trả thêm các member không hợp lệ

#### Scenario: Main board total assigned count remains valid after reserve removal
- **WHEN** main board hiển thị tổng số người đã xếp
- **THEN** tổng này SHALL tiếp tục phản ánh lane chính đã xếp
- **THEN** reserve lane removal SHALL không làm total assigned count bị sai lệch

#### Scenario: Team card hideSkills path remains compatible
- **WHEN** snapshot/team view render với `hideSkills` để ẩn interactive skill editing
- **THEN** team card SHALL vẫn hoạt động bình thường với contract một lane
- **THEN** reserve lane removal SHALL không phá path render read-only/hideSkills

#### Scenario: Import attendance helper maintains duplicate prevention
- **WHEN** payload import chứa duplicate member IDs hoặc member đã xếp trước đó
- **THEN** helper SHALL tiếp tục dùng `assignedIds` để ngăn duplicate assignment
- **THEN** duplicate prevention SHALL hoạt động chỉ trên lane chính của model mới

#### Scenario: Snapshot restore preserves valid leader if still assigned
- **WHEN** snapshot cũ hoặc mới có `leaderMemberId` hợp lệ và member đó nằm trong lane chính sau restore
- **THEN** leader SHALL vẫn được giữ lại
- **THEN** reserve lane removal SHALL không xóa leader hợp lệ chỉ vì contract đã đổi

#### Scenario: Main board group leader dropdown remains populated
- **WHEN** người dùng chỉnh leader của một đoàn trong main board
- **THEN** dropdown option SHALL vẫn được populate từ member đang có trong lane chính
- **THEN** contract mới SHALL không làm dropdown rỗng nếu team có member hợp lệ

#### Scenario: Attendance source member visibility excludes NOGO
- **WHEN** source member pool là attendance
- **THEN** member có vote `NOGO` SHALL không xuất hiện trong danh sách chờ xếp
- **THEN** điều này SHALL được quyết định bởi `GO`-only visibility logic

#### Scenario: Empty snapshot detail stats remain well-formed
- **WHEN** snapshot detail render một snapshot có ít hoặc không có member ở lane chính
- **THEN** stats overview SHALL vẫn hiển thị số liệu hợp lệ theo contract mới
- **THEN** reserve lane removal SHALL không làm card stats render lỗi

#### Scenario: Lineup restore route remains compatible with snapshot actions UI
- **WHEN** người dùng bấm restore snapshot từ snapshot modal/page
- **THEN** route và UI action flow SHALL tiếp tục hoạt động với simplified lineup contract
- **THEN** reserve lane removal SHALL không làm hỏng snapshot restore UX

#### Scenario: Legacy reserve slot data does not affect assignedMemberIds collection
- **WHEN** helper `collectAssignedMemberIds` chạy sau khi nhận state hợp lệ theo contract mới
- **THEN** chỉ `memberIds` hiện hành SHALL được tính là assigned
- **THEN** mọi reserve lane legacy data bị bỏ qua SHALL không làm count sai

#### Scenario: Member pool dropdown and import modal session labels stay coherent
- **WHEN** session labels được hiển thị trong dropdown source hoặc import modal
- **THEN** labels SHALL phản ánh summary hiện hành không có reserve-specific counts
- **THEN** người dùng SHALL không thấy term `Dự bị` trong flow attendance-to-lineup mới

#### Scenario: Skill clearing on replaced member still occurs
- **WHEN** một main slot đang có member bị thay thế bằng member khác
- **THEN** assigned skills của member bị thay SHALL vẫn được clear như trước
- **THEN** reserve lane removal SHALL không làm mất cleanup behavior này

#### Scenario: Snapshot write path stores only supported slots
- **WHEN** backend ghi các slot hiện tại vào snapshot storage
- **THEN** dữ liệu được coi là contract mới SHALL chỉ có lane chính được expose về sau
- **THEN** reserve lane cũ nếu còn trong DB history SHALL không quay lại contract public mới

#### Scenario: Main-only contract is reflected in helper result types
- **WHEN** helper/import/serializer functions trả kết quả về frontend hoặc service khác
- **THEN** result types SHALL phản ánh contract một lane thành viên
- **THEN** downstream callers SHALL không còn phải xử lý reserve-specific fields

#### Scenario: Attendance import GO-only semantics remain visible to user
- **WHEN** người dùng thao tác import attendance
- **THEN** UI copy SHALL làm rõ rằng chỉ member `GO` được nhập vào lineup
- **THEN** không có reserve/standby semantics nào còn hiển thị trong flow này

#### Scenario: Legacy reserve snapshot data remains non-fatal under repeated restore
- **WHEN** người dùng restore nhiều lần một snapshot cũ có reserve data
- **THEN** mỗi lần restore SHALL tiếp tục bỏ qua reserve lane một cách idempotent
- **THEN** repeated restore SHALL không sinh lỗi do reserve legacy data

#### Scenario: TeamLayout state machine remains stable after reserve removal
- **WHEN** người dùng kéo thả member/skill qua các tương tác chính của lineup
- **THEN** state machine của TeamLayout SHALL tiếp tục hoạt động chỉ với main slots
- **THEN** reserve-specific transitions SHALL không còn tồn tại trong runtime hiện hành

#### Scenario: Attendance import modal selection remains valid with no GO votes
- **WHEN** người dùng chọn một attendance session không có ai vote `GO`
- **THEN** nút import SHALL bị disable hoặc không import được thành viên nào
- **THEN** flow này SHALL không fallback sang reserve/not-voted members

#### Scenario: Snapshot detail and live lineup share the same simplified contract
- **WHEN** component dùng chung team/member rendering cho live lineup và saved snapshot
- **THEN** cả hai path SHALL cùng dựa trên contract một lane hiện hành
- **THEN** reserve lane removal SHALL giữ consistency giữa live view và snapshot view

#### Scenario: App state refresh after lineup updates remains coherent
- **WHEN** frontend reload hoặc refresh app state sau các thao tác lineup
- **THEN** state mới SHALL nhất quán với simplified lineup contract
- **THEN** không có reserve field legacy nào được kỳ vọng ở runtime mới

#### Scenario: Attendance import modal remains operable after session detail fetch
- **WHEN** chi tiết attendance session được tải xong trong modal import
- **THEN** người dùng SHALL vẫn có thể import danh sách `GO` theo contract mới
- **THEN** session detail fetch SHALL không đòi reserve/not-voted branches để hoàn tất flow

#### Scenario: Main board action buttons remain unaffected by reserve cleanup
- **WHEN** người dùng tương tác với các action button như lưu, đã lưu, tải ảnh, xếp lại, tạo mới
- **THEN** các action này SHALL tiếp tục hoạt động bình thường dưới simplified contract
- **THEN** reserve lane removal SHALL chỉ tác động domain member lane, không phá action flow

#### Scenario: Member pool visual counts still align with assigned member set
- **WHEN** member được xếp hoặc gỡ khỏi lineup trong model mới
- **THEN** count ở member pool SHALL cập nhật đúng theo set member đã xếp trên lane chính
- **THEN** reserve lane removal SHALL không làm unassigned count bị lệch

#### Scenario: Import attendance helper preserves overflow semantics under single lane
- **WHEN** số member `GO` nhiều hơn số main slots còn trống
- **THEN** overflow members SHALL được báo qua `overflowCount`
- **THEN** helper SHALL không âm thầm đưa overflow members vào lane phụ vì lane đó không còn tồn tại

#### Scenario: Team card slot skill snapshot lookup remains main-only
- **WHEN** team card render skill snapshots cho read-only snapshot/team view
- **THEN** lookup SHALL chỉ dùng key `main-*`
- **THEN** reserve lane removal SHALL không để lại lookup `reserve-*` trong runtime hiện hành

#### Scenario: History and active attendance views remain consistent with two-state model
- **WHEN** người dùng xem active attendance hoặc history attendance
- **THEN** cả hai view SHALL cùng dùng hai trạng thái `GO` và `NOGO`
- **THEN** UI SHALL không có inconsistency giữa active view và history view về `MAYBE`

#### Scenario: GvG participation selection remains aligned with attendance semantics
- **WHEN** người dùng dùng attendance làm nguồn chọn nhanh cho GvG participation
- **THEN** chỉ những member `GO` SHALL được dùng như nguồn auto-select
- **THEN** thay đổi remove `MAYBE` SHALL giữ alignment giữa attendance semantics và GvG selection

#### Scenario: Persisting simplified lineup does not regress skill clearing logic
- **WHEN** hệ thống lưu lineup mới sau một chuỗi kéo-thả/sắp xếp lại/import
- **THEN** persistence SHALL không làm quay lại contract reserve lane
- **THEN** skill clearing và member assignment đã thực hiện trước đó SHALL vẫn được lưu đúng trên lane chính

#### Scenario: Snapshot summary cards remain informative after reserve removal
- **WHEN** người dùng duyệt danh sách snapshot đã lưu
- **THEN** cards summary SHALL vẫn cung cấp đủ thông tin hữu ích về team/group/member counts theo contract mới
- **THEN** reserve lane removal SHALL không làm cards mất khả năng phân biệt snapshot

#### Scenario: Main lane only model propagates through helper clones
- **WHEN** frontend helper clone/copy `SquadGroup` hoặc `SquadTeam` state để update immutably
- **THEN** clone result SHALL chỉ chứa các field team còn được hỗ trợ trong contract mới
- **THEN** clone logic SHALL không tái thêm reserve fields một cách vô tình

#### Scenario: Removing reserve does not reintroduce assignment-note behavior
- **WHEN** lineup flow chạy trong contract mới không reserve
- **THEN** các behavior note/assignment đã bị remove trước đó SHALL vẫn không xuất hiện
- **THEN** reserve cleanup SHALL không làm quay lại bất kỳ metadata cũ nào đã được loại bỏ

#### Scenario: Live lineup and snapshot serializers stay aligned
- **WHEN** backend serialize live lineup state hoặc snapshot detail
- **THEN** cả hai serializer SHALL cùng phản ánh contract mới không reserve lane
- **THEN** frontend consuming hai nguồn dữ liệu này SHALL không gặp shape mismatch

#### Scenario: Attendance import modal action copy matches backend behavior
- **WHEN** modal import attendance hiển thị số member sẽ được nhập
- **THEN** copy của modal SHALL khớp với backend/helper behavior là nhập `GO` members vào lane chính
- **THEN** user-facing messaging SHALL không tạo kỳ vọng về reserve import

#### Scenario: GO-only source visibility remains preserved across refresh
- **WHEN** app state hoặc attendance session được refresh trong lúc source là attendance
- **THEN** danh sách member visible cho lineup source SHALL vẫn phản ánh `GO` votes mới nhất
- **THEN** refresh flow SHALL không làm tái xuất hiện reserve/not-voted semantics

#### Scenario: Simplified attendance summary propagates to every consumer
- **WHEN** bất kỳ frontend consumer nào đọc `AttendanceSession.summary`
- **THEN** consumer SHALL hoạt động với shape chỉ gồm `go`, `nogo`, `total`
- **THEN** không còn consumer nào được phép yêu cầu `summary.maybe`

#### Scenario: Main-only drag drop still supports replacing and clearing members
- **WHEN** người dùng kéo member từ pool vào slot, giữa slot với slot, hoặc từ slot về pool
- **THEN** tất cả các thao tác đó SHALL vẫn hoạt động dưới contract chỉ có main slots
- **THEN** reserve lane removal SHALL không làm giảm capability cơ bản của drag/drop lineup

#### Scenario: Snapshot restore and save flow remain round-trip safe for main lane
- **WHEN** người dùng lưu một snapshot mới rồi restore lại snapshot đó
- **THEN** lane thành viên chính và skill mapping hợp lệ SHALL round-trip chính xác
- **THEN** reserve lane removal SHALL không làm hỏng round-trip của contract mới

#### Scenario: Source selection controls remain minimal and coherent
- **WHEN** người dùng chuyển đổi giữa source `guild` và `attendance`
- **THEN** các control liên quan SHALL đủ để chọn source và session attendance cần thiết
- **THEN** UI SHALL không còn control dư thừa liên quan reserve/not-voted

#### Scenario: Snapshot overview and detail remain backward-compatible in UX
- **WHEN** người dùng mở snapshot được tạo trước hoặc sau reserve removal
- **THEN** UX viewing snapshot SHALL vẫn ổn định và dễ hiểu dưới model một lane
- **THEN** reserve lane legacy data SHALL không xuất hiện như artifact gây nhiễu cho người dùng

#### Scenario: Lineup setup and empty state remain simple after reserve removal
- **WHEN** người dùng bắt đầu từ empty lineup state
- **THEN** flow khởi tạo và xếp đội hình ban đầu SHALL rõ ràng hơn với contract chỉ có main lane
- **THEN** reserve lane removal SHALL giảm complexity thay vì tạo thêm bước phụ

#### Scenario: Simplified model remains consistent across frontend and backend boundaries
- **WHEN** dữ liệu đi qua boundary frontend ↔ backend cho lineup hoặc attendance flows liên quan
- **THEN** cả hai phía SHALL cùng dùng contract đã đơn giản hóa không reserve/MAYBE
- **THEN** implementation SHALL tránh mismatch giữa types cục bộ và payload runtime

#### Scenario: Active session summary cards show two-state model
- **WHEN** active attendance session render summary cards ở dashboard attendance
- **THEN** cards SHALL chỉ hiển thị `Tham gia` và `Không tham gia`
- **THEN** UI SHALL không còn card `Dự bị`

#### Scenario: Attendance history rows show two-state model
- **WHEN** attendance history list render summary pills cho mỗi session
- **THEN** pills SHALL chỉ hiển thị `GO` và `NOGO`
- **THEN** UI SHALL không còn pill `MAYBE`

#### Scenario: Attendance filter options exclude MAYBE
- **WHEN** người dùng lọc vote trong attendance details panel
- **THEN** filter dropdown SHALL chỉ có `ALL`, `GO`, và `NOGO`
- **THEN** người dùng SHALL không thể chọn `MAYBE`

#### Scenario: Attendance total votes remain coherent under two-state model
- **WHEN** session summary card tính tổng lượt vote
- **THEN** `totalVotes` SHALL bằng `summary.go + summary.nogo`
- **THEN** tổng này SHALL không phụ thuộc field `maybe`

#### Scenario: GvG participation quick-select excludes standby semantics
- **WHEN** người dùng chọn nhanh member từ attendance session trong GvG participation modal
- **THEN** quick-select SHALL chỉ có option `Tham gia`
- **THEN** UI SHALL không còn quick-select `Dự bị`

#### Scenario: GvG participation attendance label excludes reserve wording
- **WHEN** modal GvG hiển thị label của attendance session trong dropdown/session preview
- **THEN** label SHALL chỉ dùng summary phù hợp với mô hình hiện hành
- **THEN** label SHALL không nhắc tới `Dự bị` hoặc `summary.maybe`

#### Scenario: Attendance not-voted helper copy reflects two-state model
- **WHEN** attendance details render bảng `Chưa điểm danh`
- **THEN** copy giải thích SHALL chỉ nói member chưa chọn `Tham gia` hoặc `Không tham gia`
- **THEN** UI SHALL không nhắc tới `Dự bị`

#### Scenario: Backend attendance public content excludes reserve list
- **WHEN** backend render nội dung attendance public cho Discord
- **THEN** public content SHALL không có section `Danh sách dự bị`
- **THEN** summary block SHALL không có dòng `❔ Dự bị`

#### Scenario: Attendance choice parsing rejects MAYBE at HTTP boundary
- **WHEN** backend parse attendance choice từ HTTP request mới
- **THEN** parser SHALL chỉ chấp nhận `GO` hoặc `NOGO`
- **THEN** request mới dùng `MAYBE` SHALL bị coi là invalid

#### Scenario: Discord attendance button parser rejects MAYBE
- **WHEN** backend parse custom ID từ Discord attendance button mới
- **THEN** parser SHALL chỉ chấp nhận `GO` hoặc `NOGO`
- **THEN** custom ID dùng `MAYBE` SHALL không được coi là hợp lệ trong flow mới

#### Scenario: Bot reply labels use two-state model
- **WHEN** Discord bot phản hồi sau khi người dùng bấm nút attendance
- **THEN** label phản hồi SHALL chỉ có `Tham gia` hoặc `Không tham gia`
- **THEN** bot SHALL không phản hồi bằng nhãn `Dự bị`

### Requirement: Lineup persistence excludes member note metadata
Dữ liệu lineup hiện hành và snapshot mới SHALL không bao gồm `memberNotes` trong team payload hoặc snapshot payload.

#### Scenario: System serializes lineup state
- **WHEN** backend hoặc frontend serialize dữ liệu lineup hiện hành
- **THEN** mỗi team payload SHALL chỉ bao gồm các field lineup còn được hỗ trợ
- **THEN** output SHALL NOT chứa field `memberNotes`
- **THEN** output SHALL NOT chứa field `reserveMemberIds`

#### Scenario: System saves a new lineup snapshot
- **WHEN** người dùng lưu một lineup snapshot mới
- **THEN** snapshot được ghi ra SHALL NOT chứa `memberNotes`
- **THEN** snapshot được ghi ra SHALL NOT chứa `reserveMemberIds`

### Requirement: Legacy snapshots with memberNotes remain restorable
Hệ thống SHALL tiếp tục đọc được snapshot cũ có chứa `memberNotes`, nhưng SHALL bỏ qua field này trong quá trình restore.

#### Scenario: Restore snapshot created before the cleanup
- **WHEN** hệ thống đọc một snapshot cũ có field `memberNotes` trong team data
- **THEN** quá trình restore SHALL hoàn tất mà không lỗi chỉ vì field này tồn tại
- **THEN** trạng thái lineup sau restore SHALL không expose hoặc sử dụng `memberNotes`

#### Scenario: Restore snapshot created before reserve removal
- **WHEN** hệ thống đọc một snapshot cũ có `reserveMemberIds` hoặc slot skill dữ liệu cho reserve slots
- **THEN** quá trình restore SHALL hoàn tất mà không lỗi chỉ vì reserve data tồn tại
- **THEN** trạng thái lineup sau restore SHALL chỉ sử dụng lane thành viên chính của model mới
