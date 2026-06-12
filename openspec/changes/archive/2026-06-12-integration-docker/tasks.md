## 1. Assess runtime and deployment inputs

- [x] 1.1 Xác định đầy đủ các environment variables và runtime dependency mà frontend và backend cần khi chạy trong container
- [x] 1.2 Xác minh backend startup flow, bao gồm `PORT`, `DATABASE_URL`, Prisma client generation, và migration command phù hợp cho môi trường container
- [x] 1.3 Quyết định phạm vi database integration cho Docker workflow: external database only hay bổ sung database service cho local compose

## 2. Add container build definitions

- [x] 2.1 Tạo Dockerfile cho frontend với build/run flow phù hợp cho local development và có thể mở rộng sang deployment-oriented runtime
- [x] 2.2 Tạo Dockerfile cho backend với build/run flow bao quát cài dependency, build TypeScript, và Prisma lifecycle cần thiết
- [x] 2.3 Thêm `.dockerignore` và tối ưu build context cho repo root, frontend, và backend theo cấu trúc image đã chọn

## 3. Add local orchestration workflow

- [x] 3.1 Tạo `docker-compose.yml` hoặc `compose.yaml` ở repo root để orchestration frontend và backend bằng một entrypoint thống nhất
- [x] 3.2 Cấu hình port mapping, service naming, network access, và environment wiring để frontend gọi backend đúng trong container network
- [x] 3.3 Nếu scope yêu cầu local database container, thêm service tương ứng và nối `DATABASE_URL` theo topology đã chọn

## 4. Align application runtime behavior

- [x] 4.1 Điều chỉnh hoặc xác nhận backend runtime behavior để bind đúng vào platform-assigned `PORT` và không phụ thuộc vào host-only assumptions
- [x] 4.2 Điều chỉnh hoặc xác nhận frontend API endpoint configuration để dùng `VITE_DISCORD_API_URL` nhất quán giữa host mode, container mode, và deployment target như Railway
- [x] 4.3 Xác định rõ migration/deployment command cho backend container lifecycle mà không tạo side effect không mong muốn khi startup

## 5. Document and verify container workflows

- [x] 5.1 Cập nhật tài liệu hướng dẫn cách build và chạy project bằng Docker cho local development
- [x] 5.2 Tài liệu hóa sự khác biệt giữa local container workflow và deployment-oriented workflow, bao gồm ghi chú cho Railway-style deployment
- [x] 5.3 Xác minh end-to-end rằng frontend và backend có thể build thành công, khởi chạy qua container workflow, và giao tiếp được với nhau theo cấu hình đã tài liệu hóa
