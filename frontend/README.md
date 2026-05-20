# GvG Manager Frontend

React + Vite frontend for Discord OAuth login, guild/member management, and GvG lineup planning.

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env` from `.env.example`:
   ```bash
   VITE_DISCORD_API_URL=http://localhost:3001
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

The dev server runs on port 3000 and expects the backend API to be available at `VITE_DISCORD_API_URL`.
