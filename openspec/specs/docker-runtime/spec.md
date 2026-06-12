## Purpose

Cung cấp contract cho khả năng build và chạy frontend/backend của project bằng Docker với cấu hình container nhất quán, bao gồm runtime configuration và backend Prisma lifecycle.

## Requirements

### Requirement: Project can be built and run with Docker
Hệ thống MUST cung cấp Docker-based runtime cho frontend và backend, cho phép mỗi ứng dụng được build thành container image riêng và khởi chạy bằng command container chuẩn, không phụ thuộc vào việc cài runtime trực tiếp trên host machine.

#### Scenario: Build frontend image successfully
- **WHEN** người dùng build image cho frontend từ source code hiện tại
- **THEN** quá trình build MUST tạo ra image có thể khởi chạy frontend application thành công

#### Scenario: Build backend image successfully
- **WHEN** người dùng build image cho backend từ source code hiện tại
- **THEN** quá trình build MUST tạo ra image có thể khởi chạy backend application thành công

#### Scenario: Run backend with platform-assigned port
- **WHEN** backend container được khởi chạy trong môi trường platform cung cấp `PORT`
- **THEN** backend MUST bind vào giá trị `PORT` thay vì yêu cầu cổng cố định nội bộ duy nhất

### Requirement: Runtime configuration MUST be environment-driven
Hệ thống MUST định nghĩa cấu hình runtime của frontend và backend thông qua environment variables để cùng một codebase có thể chạy được trong local container environment và trên deployment platform như Railway.

#### Scenario: Frontend receives API base URL from environment
- **WHEN** frontend được build hoặc khởi chạy với `VITE_DISCORD_API_URL`
- **THEN** frontend MUST sử dụng giá trị đó làm API base URL thay vì hardcode địa chỉ backend

#### Scenario: Backend receives database connection from environment
- **WHEN** backend được khởi chạy với `DATABASE_URL`
- **THEN** backend MUST dùng giá trị đó cho Prisma database connection

### Requirement: Backend container lifecycle MUST account for Prisma
Backend container runtime MUST bao quát Prisma-related requirements để ứng dụng không rơi vào trạng thái build thành công nhưng runtime thất bại vì thiếu Prisma client hoặc thiếu bước migration/deployment workflow.

#### Scenario: Prisma client is available at runtime
- **WHEN** backend container start sau khi build image hoàn tất
- **THEN** Prisma client MUST đã được generate và sẵn sàng cho application code sử dụng

#### Scenario: Migration workflow is explicitly defined
- **WHEN** backend được chuẩn bị cho môi trường triển khai
- **THEN** giải pháp Docker MUST nêu rõ migration command nào được dùng và ở giai đoạn nào của lifecycle nó được chạy
