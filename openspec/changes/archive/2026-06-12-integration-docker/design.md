## Context

Project hiện được tổ chức thành hai phần chính: `frontend/` dùng React + Vite chạy ở port `3000`, và `backend/` dùng Node.js/TypeScript với Prisma để cung cấp API và workflow backend. Cách chạy hiện tại dựa trên local host environment, yêu cầu khởi động frontend và backend riêng rẽ, đồng thời tự quản lý biến môi trường và sự phụ thuộc giữa các service.

Việc Docker hóa là thay đổi cross-cutting vì ảnh hưởng đồng thời đến frontend, backend, cấu hình runtime, networking, và quy trình local onboarding. Backend còn có Prisma scripts nên thiết kế cần làm rõ cách build image, chạy container, truyền environment variables, và xử lý startup dependency để tránh tạo ra container chỉ build được nhưng khó vận hành.

## Goals / Non-Goals

**Goals:**
- Chuẩn hóa cách build và run project bằng container cho cả frontend và backend.
- Cho phép khởi động local stack bằng một orchestration entrypoint nhất quán, ưu tiên `docker compose`.
- Đảm bảo frontend có thể giao tiếp với backend qua container networking và cấu hình endpoint rõ ràng.
- Tách bạch nhu cầu development/local runtime với production-oriented image layout để tránh một cấu hình gánh quá nhiều mục tiêu.
- Bao quát nhu cầu của backend liên quan đến Prisma/client generation và runtime startup trong môi trường container.

**Non-Goals:**
- Không thay đổi business logic của frontend hoặc backend.
- Không tái thiết kế API contract hiện có.
- Không đưa thêm hệ thống orchestration production như Kubernetes.
- Không cam kết Docker hóa toàn bộ hạ tầng ngoài phạm vi repo nếu chưa được định nghĩa trong project.

## Decisions

### 1. Dùng `docker compose` làm orchestration layer chính
**Decision:** Cung cấp một `docker-compose.yml` hoặc `compose.yaml` ở repo root để khởi động các service chính của project.

**Why:** Project có ít nhất hai service phụ thuộc lẫn nhau là frontend và backend. `docker compose` là lựa chọn trực tiếp nhất để mô tả networking, port mapping, environment variables, volume mount, và startup command trong local development.

**Alternatives considered:**
- Chỉ cung cấp Dockerfile riêng lẻ: đơn giản hơn nhưng không giải quyết orchestration giữa frontend và backend.
- Dùng shell script để chạy nhiều `docker run`: khó bảo trì và khó mô tả dependency/config hơn compose.

### 2. Tách Dockerfile cho frontend và backend
**Decision:** Mỗi ứng dụng có Dockerfile riêng trong phạm vi thư mục tương ứng hoặc cấu trúc tương đương dễ xác định trách nhiệm build.

**Why:** Frontend và backend có dependency tree, build step, và startup command khác nhau. Tách Dockerfile giúp tối ưu cache, giảm coupling, và dễ mở rộng nếu sau này cần profile build riêng cho development và production.

**Alternatives considered:**
- Một Dockerfile chung cho cả repo: khó bảo trì, làm build context lớn, và trộn responsibility giữa hai app.
- Chỉ containerize backend trước: không đáp ứng mục tiêu chạy toàn bộ stack bằng container.

### 3. Ưu tiên model “development-first, production-capable”
**Decision:** Thiết kế trước hết phục vụ local/containerized startup, nhưng cấu trúc image và command nên đủ rõ ràng để mở rộng sang production-oriented build mà không phải viết lại từ đầu.

**Why:** Nhu cầu hiện tại là “khởi chạy bằng container”, nên local usability là giá trị đầu tiên. Tuy nhiên nếu chỉ tối ưu cho live-reload development, giải pháp có thể khó tái sử dụng cho CI/CD hoặc deployment sau này.

**Alternatives considered:**
- Chỉ làm dev container với bind mounts và watch mode: nhanh để bắt đầu nhưng ít tái sử dụng cho build/deploy.
- Chỉ làm production image: tốt cho deploy nhưng làm giảm trải nghiệm local iteration.

### 4. Chuẩn hóa endpoint config giữa frontend và backend qua environment variables
**Decision:** Frontend tiếp tục dùng `VITE_DISCORD_API_URL`, nhưng giá trị mặc định và cách inject cần tương thích với container networking. Backend cũng cần file/env contract rõ ràng cho các biến bắt buộc.

**Why:** Khi chạy trong container, `localhost` bên trong frontend container không còn trỏ đến backend chạy trên host. Cần định nghĩa rõ endpoint theo service name hoặc publish port để tránh lỗi cấu hình ngầm.

**Alternatives considered:**
- Hardcode service URL trong source code: dễ gây sai khác giữa local host mode và container mode.
- Chỉ dựa vào README hướng dẫn chỉnh tay: không đủ nhất quán và dễ sinh lỗi onboarding.

### 5. Xử lý Prisma như một phần của backend container lifecycle
**Decision:** Thiết kế cần dự liệu việc `prisma generate` và migration-related commands trong backend image/runtime flow, đồng thời tránh phụ thuộc vào bước thủ công mơ hồ bên ngoài container.

**Why:** Backend có dependency vào Prisma client và có workflow migrate riêng. Nếu không đưa điều này vào design, container có thể build thành công nhưng fail khi runtime hoặc khi database schema chưa sẵn sàng.

**Alternatives considered:**
- Bỏ Prisma ra ngoài phạm vi Docker hóa: giảm việc phải suy nghĩ ngay nhưng tạo lỗ hổng lớn trong tính chạy được của backend.
- Tự động chạy mọi migration trên startup: tiện lợi nhưng tăng rủi ro nếu không phân biệt development và deployment scenario.

### 6. Giữ database là điểm cấu hình mở trong thiết kế
**Decision:** Thiết kế Docker hóa frontend/backend trước, đồng thời để database integration là configurable path thay vì mặc định khẳng định phải thêm database container ngay lập tức.

**Why:** Từ codebase hiện tại mới xác nhận được Prisma workflow, nhưng chưa đủ bằng chứng về database topology cụ thể trong repo. Thiết kế nên chừa chỗ cho cả hai trường hợp: kết nối database external hoặc thêm database service vào compose nếu project yêu cầu.

**Alternatives considered:**
- Bắt buộc thêm database container ngay trong scope: có thể đúng, nhưng dễ mở rộng scope khi chưa xác minh đầy đủ.
- Bỏ qua hoàn toàn database concern: khiến giải pháp container hóa thiếu thực dụng.

## Risks / Trade-offs

- **[Environment drift giữa host mode và container mode]** → Mitigation: định nghĩa rõ env contract và ví dụ giá trị cho từng mode chạy.
- **[Frontend gọi sai backend endpoint khi vào container network]** → Mitigation: dùng service naming rõ ràng trong compose và tài liệu hóa mapping của `VITE_DISCORD_API_URL`.
- **[Backend startup fail do Prisma client hoặc migration state]** → Mitigation: đưa Prisma lifecycle vào Docker design và làm rõ command nào chạy ở build time vs runtime.
- **[Một cấu hình cố gắng phục vụ cả dev lẫn production dẫn tới phức tạp]** → Mitigation: tách decision giữa local-first workflow và production-oriented image behavior ngay trong thiết kế.
- **[Scope creep nếu kéo cả database orchestration vào ngay]** → Mitigation: giữ database integration là explicit decision point, chỉ thêm container DB nếu requirement/spec xác nhận cần.
- **[Build context lớn và image build chậm]** → Mitigation: tách Dockerfile theo app và dùng `.dockerignore` phù hợp trong implementation.
