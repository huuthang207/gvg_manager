# GvG Manager

## Local development with Docker

Project này có thể khởi chạy local bằng Docker Compose với 3 service:
- `postgres`
- `backend`
- `frontend`

### 1. Prepare local env files

```bash
cp backend/.env.docker.example backend/.env.docker
cp frontend/.env.docker.example frontend/.env.docker
```

Cập nhật `backend/.env.docker` với Discord/OAuth secrets thật nếu cần login hoặc bot integration. Không commit các file `.env.docker` chứa secrets.

### 2. Start the stack

```bash
docker compose up --build
```

Sau khi start thành công:
- frontend: `http://localhost:3000`
- backend health: `http://localhost:3001/api/health`
- postgres: `localhost:5432`

### 3. Runtime configuration

Docker workflow local đọc các file env cục bộ sau, được tạo từ `.example`:
- `backend/.env.docker`
- `frontend/.env.docker`

Các giá trị này ưu tiên local container workflow. Nếu cần OAuth hoặc Discord bot đầy đủ, hãy cập nhật các biến sau trong `backend/.env.docker`:
- `DISCORD_BOT_TOKEN`
- `DISCORD_BOT_ENABLED`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `FIXED_GUILD_DISCORD_ID`
- `ADMIN_DISCORD_USER_ID`

### 4. Database and Prisma

Local Compose bao gồm PostgreSQL container để stack có thể chạy end-to-end mà không cần cài database ngoài host.

Backend container dùng các nguyên tắc sau:
- `npx prisma generate` được chạy trong container lifecycle
- local Compose đặt `RUN_DB_MIGRATIONS=true`, nên backend sẽ chạy `npm run prisma:migrate:deploy` trước khi start
- nếu không set `RUN_DB_MIGRATIONS`, production runtime (`NODE_ENV=production`) sẽ tự chạy `npm run prisma:migrate:deploy` trước khi start
- nếu cần reset dữ liệu local, có thể xóa volume Docker tương ứng

### 5. Development vs deployment-oriented runtime

`compose.yaml` được tối ưu cho local development:
- frontend dùng Vite dev server
- backend dùng `tsx watch`
- PostgreSQL chạy như local dependency

Dockerfiles cũng có production-oriented target:
- `frontend/Dockerfile` có target `prod`
- `backend/Dockerfile` có target `prod`

Điều này cho phép build image để triển khai lên các platform container như Railway, nhưng deployment workflow không nên xem là bản sao y hệt local Compose.

## Railway-style deployment notes

Railway phù hợp hơn với mô hình nhiều service riêng thay vì chạy nguyên `docker compose` như local.

Recommended layout:
- 1 service cho frontend
- 1 service cho backend
- 1 managed PostgreSQL database hoặc external PostgreSQL

### Backend on Railway

Tạo **một service backend riêng** với Root Directory là `backend` (hoặc Dockerfile path là `backend/Dockerfile`). Không deploy từ repository root nếu Railway không được cấu hình Dockerfile rõ ràng.

Backend đã hỗ trợ `PORT` động qua `process.env.PORT`. Không cần và không nên tự đặt biến `PORT` trên Railway. Cấu hình health check của service là:

```text
/api/health
```

Khi domain đã trỏ đúng backend, các URL sau phải trả JSON từ Express:

```text
GET https://api.example.com/
# {"service":"gvg-manager-backend","health":"/api/health"}

GET https://api.example.com/api/health
# {"status":"ok","timestamp":"..."}
```

Biến môi trường tối thiểu cho backend production:

```bash
NODE_ENV=production
DATABASE_URL=<Railway PostgreSQL URL>
FRONTEND_URL=https://app.example.com
CORS_ORIGINS=https://app.example.com
DISCORD_REDIRECT_URI=https://api.example.com/api/discord/oauth/callback
SESSION_COOKIE_SECURE=true
# Optional: omit to auto-select None when frontend and callback origins differ.
# Set None explicitly only when the frontend/API are truly cross-site.
SESSION_COOKIE_SAME_SITE=None
DISCORD_CLIENT_ID=<Discord client ID>
DISCORD_CLIENT_SECRET=<Discord client secret>
DISCORD_BOT_TOKEN=<Discord bot token>
BOT_INTERNAL_TOKEN=<long random secret>
FIXED_GUILD_DISCORD_ID=<managed guild ID>
ADMIN_DISCORD_USER_ID=<bootstrap admin Discord ID>
RUN_DB_MIGRATIONS=true
DISCORD_BOT_ENABLED=true
```

- Đăng ký **đúng y hệt** giá trị `DISCORD_REDIRECT_URI` trong Discord Developer Portal → OAuth2 → Redirects.
- backend container production hiện mặc định chạy `npm run prisma:migrate:deploy` trước khi start nếu bạn không override `RUN_DB_MIGRATIONS`.
- nếu dùng release step riêng cho migration, set `RUN_DB_MIGRATIONS=false` ở runtime để tránh chạy lặp lại.
- chỉ đúng **một** replica/service nên để `DISCORD_BOT_ENABLED=true`; các replica API bổ sung phải dùng `false` để tránh nhiều instance cùng consume Discord interactions.

Nếu bạn vừa deploy code mới có schema mới như `AttendanceVoteJob`, hãy chắc rằng migration đã được áp dụng trước khi worker chạy; nếu không bạn sẽ gặp lỗi `The table public.AttendanceVoteJob does not exist`.

Ví dụ start flow an toàn trên Railway:
- release step: `npm --prefix backend run prisma:migrate:deploy`
- runtime/start: dùng backend Docker image hoặc `npm --prefix backend start`
- hoặc chỉ dùng runtime Docker image với `RUN_DB_MIGRATIONS=true`

Để tránh race với Discord bot:
- local, staging, production không nên dùng chung bot token nếu cùng online
- nếu bắt buộc dùng chung token, chỉ được có đúng một môi trường bật bot tại một thời điểm
- tốt nhất dùng bot token riêng cho từng môi trường

### Frontend on Railway

Tạo **một service frontend riêng** với Root Directory là `frontend` (hoặc Dockerfile path là `frontend/Dockerfile`). Frontend production server sẽ dùng `PORT` do Railway cấp.

Frontend phải được build với `VITE_DISCORD_API_URL` là **public backend origin**, không có `/api` và không có dấu `/` cuối URL:

```bash
VITE_DISCORD_API_URL=https://api.example.com
```

Đây là Docker **build argument**, không chỉ là runtime variable. Vite nhúng `VITE_*` vào static bundle khi chạy `npm run build`; sau khi thay đổi biến này phải force redeploy/rebuild frontend. Cấu hình build argument trên Railway với giá trị backend domain, ví dụ `https://api.nthguild.net`.

Trong local Docker Compose, frontend vẫn dùng `http://localhost:3001` vì browser chạy trên host machine và truy cập backend qua published port.

### Diagnose Railway “Hello World”

`GET /api/discord/oauth/authorize` được xử lý bởi Express và phải redirect sang `discord.com`; source code này không có response `Hello World`. Vì vậy nếu `https://api.example.com/api/health` hoặc URL login trả về trang `Hello World`, request đang đi tới **sai Railway service/domain**, không phải backend này.

Kiểm tra theo thứ tự:

1. Mở generated Railway domain của backend tại `/api/health`; phải nhận health JSON.
2. Mở custom domain API tại `/api/health`; phải nhận cùng health JSON.
3. Trong Railway service Settings → Networking, xác nhận custom API domain được gắn vào backend service, không phải frontend, starter service, hay deployment cũ. Gỡ/gắn lại domain nếu cần.
4. Xác nhận DNS custom domain dùng target Railway hiện tại và không còn CNAME/A record cũ.
5. Sau khi backend domain hoạt động, rebuild frontend với `VITE_DISCORD_API_URL=https://api.example.com`.
6. Kiểm tra browser DevTools: Login phải điều hướng tới `https://api.example.com/api/discord/oauth/authorize`, sau đó Discord callback về `https://api.example.com/api/discord/oauth/callback` và redirect lại `FRONTEND_URL`.

Nếu `GET /api/health` trả JSON nhưng OAuth chưa thành công, kiểm tra `DISCORD_CLIENT_ID`, callback URL trong Discord Developer Portal, `CORS_ORIGINS`, và cookie `Secure; SameSite=None`.

## Manual commands

### Build only

```bash
docker compose build
```

### Stop the stack

```bash
docker compose down
```

### Stop and remove database volume

```bash
docker compose down -v
```
