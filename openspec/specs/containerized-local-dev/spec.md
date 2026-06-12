## Purpose

Cung cấp contract cho local development workflow chạy bằng container, bao gồm orchestration entrypoint, networking giữa frontend/backend, và environment contract cho người dùng mới.

## Requirements

### Requirement: Local stack can be started through a single container orchestration entrypoint
Hệ thống MUST cung cấp một orchestration entrypoint thống nhất cho local development, ưu tiên `docker compose`, để người dùng có thể khởi động stack mà không cần tự chạy frontend và backend bằng các lệnh rời rạc trên host machine.

#### Scenario: Start local stack from orchestration config
- **WHEN** người dùng chạy orchestration command được tài liệu hóa cho local environment
- **THEN** frontend và backend MUST cùng được khởi động theo cấu hình container đã định nghĩa

#### Scenario: Local stack exposes documented ports
- **WHEN** local stack được khởi động thành công
- **THEN** các service MUST publish các cổng cần thiết theo tài liệu để người dùng có thể truy cập frontend và backend từ máy local

### Requirement: Frontend and backend MUST communicate correctly inside containerized local networking
Cấu hình local container networking MUST đảm bảo frontend có thể gọi backend bằng endpoint phù hợp với môi trường container thay vì phụ thuộc ngầm vào `localhost` trên host machine.

#### Scenario: Frontend uses container-compatible backend endpoint
- **WHEN** frontend chạy trong local container stack
- **THEN** giá trị cấu hình API endpoint MUST trỏ đến backend bằng địa chỉ tương thích với container networking

#### Scenario: Service naming is documented for local runtime
- **WHEN** người dùng cần điều chỉnh hoặc debug kết nối giữa các service
- **THEN** cấu hình local runtime MUST làm rõ service name hoặc hostname mà frontend dùng để kết nối đến backend

### Requirement: Local container workflow MUST document environment contracts
Giải pháp local container hóa MUST mô tả rõ các environment variables bắt buộc hoặc tùy chọn cho từng service để onboarding không phụ thuộc vào kiến thức ngầm.

#### Scenario: Required environment variables are listed
- **WHEN** người dùng thiết lập local container environment lần đầu
- **THEN** tài liệu và cấu hình MUST chỉ ra những environment variables nào là bắt buộc cho frontend và backend

#### Scenario: Local workflow distinguishes development behavior from deployment behavior
- **WHEN** người dùng đọc hướng dẫn container workflow
- **THEN** hệ thống MUST phân biệt rõ phần nào dành cho local development và phần nào dành cho deployment-oriented runtime
