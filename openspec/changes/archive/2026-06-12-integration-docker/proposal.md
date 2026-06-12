## Why

Project hiện có thể chạy local bằng cách khởi động riêng frontend và backend, nhưng chưa có cách chuẩn hóa để khởi chạy toàn bộ stack bằng container. Docker hóa lúc này giúp đơn giản hóa môi trường chạy, giảm sai khác giữa máy phát triển và môi trường triển khai, đồng thời tạo nền tảng rõ ràng cho local onboarding và đóng gói ứng dụng.

## What Changes

- Bổ sung khả năng khởi chạy frontend và backend bằng Docker thay cho việc cài và chạy thủ công trên host machine.
- Định nghĩa cách orchestration các service chính của project bằng container để có thể start project với cấu hình nhất quán.
- Chuẩn hóa cấu hình môi trường, port mapping, và kết nối giữa frontend với backend khi chạy trong container.
- Xác định cách build và run cho cả development/local runtime và production-oriented image nếu cần.
- Bao quát các dependency runtime liên quan đến backend startup và Prisma workflow trong môi trường container.

## Capabilities

### New Capabilities
- `docker-runtime`: Cung cấp khả năng build và chạy frontend/backend của project bằng Docker với cấu hình container nhất quán.
- `containerized-local-dev`: Cung cấp cách khởi chạy local stack bằng container, bao gồm networking, environment configuration, và command startup cho các service.

### Modified Capabilities
- None.

## Impact

- Affected code: `frontend/`, `backend/`, file cấu hình ở repo root phục vụ Docker/runtime orchestration.
- Affected systems: local development workflow, container runtime, service-to-service networking.
- Affected dependencies: Docker, Docker Compose hoặc compose-compatible workflow, biến môi trường cho frontend/backend, và khả năng tích hợp Prisma/backend startup trong container.
- Potential API/runtime impact: frontend sẽ không còn mặc định phụ thuộc hoàn toàn vào backend chạy thủ công trên host; cấu hình endpoint cần tương thích với môi trường container.