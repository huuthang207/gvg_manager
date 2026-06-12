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
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `FIXED_GUILD_DISCORD_ID`
- `ADMIN_DISCORD_USER_ID`

### 4. Database and Prisma

Local Compose bao gồm PostgreSQL container để stack có thể chạy end-to-end mà không cần cài database ngoài host.

Backend container dùng các nguyên tắc sau:
- `npx prisma generate` được chạy trong container lifecycle
- local Compose đặt `RUN_DB_MIGRATIONS=true`, nên backend sẽ chạy `npm run prisma:migrate:deploy` trước khi start
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
- chạy `npm run prisma:migrate:deploy` ở release step hoặc trước startup theo workflow của bạn
- giữ `RUN_DB_MIGRATIONS=false` nếu không muốn migration tự chạy mỗi lần container start

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
