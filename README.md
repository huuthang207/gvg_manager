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

Backend đã hỗ trợ `PORT` động qua `process.env.PORT`. Với deployment-oriented runtime:
- cung cấp `DATABASE_URL`
- cung cấp các Discord/OAuth secrets cần thiết
- backend container production hiện mặc định chạy `npm run prisma:migrate:deploy` trước khi start nếu bạn không override `RUN_DB_MIGRATIONS`
- nếu muốn tắt behavior đó, set `RUN_DB_MIGRATIONS=false` rõ ràng
- nếu bạn dùng release step riêng cho migration, có thể vẫn giữ release step đó và để `RUN_DB_MIGRATIONS=false` ở runtime để tránh chạy lặp lại
- chỉ đúng **một** replica/service nên để `DISCORD_BOT_ENABLED=true`
- các replica API bổ sung hoặc service phụ nên để `DISCORD_BOT_ENABLED=false` để tránh nhiều instance cùng consume Discord interactions

Khuyến nghị tối thiểu trên Railway cho backend service:
- `NODE_ENV=production`
- `RUN_DB_MIGRATIONS=true` (hoặc bỏ trống để dùng mặc định production hiện tại)
- `DISCORD_BOT_ENABLED=true` chỉ trên đúng một service xử lý bot
- mọi service/replica khác dùng cùng codebase nhưng không xử lý bot nên set `DISCORD_BOT_ENABLED=false`
- nếu scale backend > 1 replica, chỉ một replica nên được phép xử lý Discord interactions

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

Frontend cần được build với `VITE_DISCORD_API_URL` trỏ tới public backend URL, ví dụ:

```bash
VITE_DISCORD_API_URL=https://your-backend-service.up.railway.app
```

Trong local Docker Compose, frontend vẫn dùng `http://localhost:3001` vì browser chạy trên host machine và truy cập backend qua published port.

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
