# FLEETBOT SmartFleet

Full-stack equipment rental and fleet-monitoring foundation. The React dashboard runs independently with polished demo data; the Express API uses PostgreSQL via `pg` and supplies protected equipment and rental endpoints.

## Run the dashboard

```powershell
cd frontend
Copy-Item .env.example .env
npm run dev
```

## Run the API

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Set DATABASE_URL and JWT_SECRET in .env, then load src/db/schema.sql into Neon
npm run dev
```

API routes include `GET/POST /api/equipment`, `GET /api/equipment/:id/telemetry`, `GET /api/dashboard`, `GET /api/requests`, `GET /api/customers`, and `PATCH /api/equipment/:id/status`. Vite proxies `/api` to port 5000 during development.

The frontend reads `VITE_API_URL` from `frontend/.env`. The backend reads `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, and `PORT` from `backend/.env`. These local files are ignored by Git.
