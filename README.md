# Leavewise

A leave management app for small teams. Employees apply for leave and see who else is away, managers approve or decline with the team's availability in front of them, and HR sets allowances, holidays and the clash limit.

**What makes it different:** while you apply, Leavewise shows how many teammates are already off on the same days. If more than the team's limit (30% by default) would be away, the employee sees a warning and the manager sees a clash flag on the request. It warns, it never blocks.

| Layer | Tech | Hosting |
|---|---|---|
| Frontend | Angular 21 (standalone components, signals) | Vercel |
| Backend | Spring Boot 4.1, Java 17+, Spring Security with JWT, Spring Data JPA, Flyway | Render (Docker) |
| Database | PostgreSQL | Supabase |

## Features

- **Employee:** leave balance per type, apply with a live summary (working days, balance after, team clash), cancel waiting or future leave, team calendar
- **Manager:** approval queue with balance and clash for each request, approve, or decline with a required reason
- **HR:** yearly allowance per leave type, half-day rules, clash limit, company holidays
- Working days skip weekends and company holidays
- Role-based access checked on both the server (Spring Security) and the client (route guards)
- One-click sample accounts on the sign-in page, so reviewers can try every role

## Project structure

```
leavewise/
├── backend/                     Spring Boot API
│   ├── src/main/java/com/leavewise/
│   │   ├── config/              security, JWT, app settings, sample data
│   │   ├── domain/              JPA entities: User, LeaveRequest, LeaveType, Holiday
│   │   ├── repo/                Spring Data repositories
│   │   ├── service/             business rules (balances, working days, clash detection)
│   │   └── web/                 REST controllers, DTOs, error handling
│   ├── src/main/resources/
│   │   ├── application.yml      settings, each overridable by an environment variable
│   │   └── db/migration/        Flyway SQL migrations (tables + reference data)
│   └── Dockerfile
├── frontend/                    Angular app
│   └── src/app/
│       ├── core/                API client, auth, guards, interceptor, helpers
│       ├── layout/              header and navigation
│       └── pages/               login, home, apply, calendar, approvals, settings
├── docker-compose.yml           local PostgreSQL
└── render.yaml                  Render blueprint for the API
```

## Database

Flyway creates the tables on first start (`V1__schema.sql`) and adds leave types, holidays and settings (`V2__reference_data.sql`). When the `users` table is empty, the app also adds a sample team (Team Orion: one manager, one HR person, eight employees) with leave dated relative to today.

```
users            id, name, email, password_hash, role, job_title, team, manager_id
leave_types      code, name, annual_quota, half_day_allowed, sort_order
leave_requests   id, user_id, type_code, from_date, to_date, half_day, days, reason, status,
                 manager_comment, decided_by, decided_at, created_at
holidays         id, holiday_date, name
app_settings     setting_key, setting_value
```

Request status: `WAITING → APPROVED | DECLINED`, and `WAITING` or future `APPROVED` → `CANCELLED`.

## API

All endpoints are under `/api`. Send the token from sign-in as `Authorization: Bearer <token>`.

| Method | Path | Who |
|---|---|---|
| POST | `/auth/login`, `/auth/demo` | anyone |
| GET | `/auth/me`, `/leave-types`, `/holidays`, `/team/away`, `/team/calendar?month=2026-10` | signed in |
| GET | `/me/balances`, `/me/leaves`, `/leaves/preview?type&from&to&halfDay` | employee |
| POST | `/leaves`, `/leaves/{id}/cancel` | employee |
| GET | `/approvals`, `/approvals/recent` | manager |
| POST | `/approvals/{id}/approve`, `/approvals/{id}/decline` | manager |
| GET/PUT | `/admin/settings`; PUT `/admin/leave-types`; POST/DELETE `/admin/holidays` | HR |

## Run it on your computer

You need Java 17 or newer, Node.js 20.19+ and PostgreSQL. The easiest way to get PostgreSQL is Docker Desktop.

```bash
# 1. Database
docker compose up -d

# 2. API on http://localhost:8080
cd backend
./mvnw spring-boot:run          # on Windows PowerShell: .\mvnw spring-boot:run

# 3. Web app on http://localhost:4200 (in a second terminal)
cd frontend
npm install
npm start
```

No Docker? Point the API at your Supabase database instead by setting `DATABASE_URL`, `DATABASE_USERNAME` and `DATABASE_PASSWORD` (see below) before step 2.

Sample accounts: use the Employee, Manager and HR buttons on the sign-in page. To sign in with the form instead, use any sample email such as `ananya.iyer@leavewise.dev`, `rahul.verma@leavewise.dev` or `kavita.sen@leavewise.dev` with the password `leavewise123` (set by `DEMO_PASSWORD`).

Run the backend tests (they use an in-memory database, no setup needed):

```bash
cd backend
./mvnw test
```

## Deploy

Do these in order: database, then API, then web app, because each one needs the address of the previous one.

### 1. Database on Supabase

1. Create a project at [supabase.com](https://supabase.com). Save the database password you choose.
2. Open **Connect** (top of the project page) and pick the **Session pooler** connection. Use the pooler, not the direct connection: the direct one only works over IPv6, which Render does not support.
3. From the pooler details, note the **host** (like `aws-0-ap-south-1.pooler.supabase.com`), **port** `5432` and **user** (like `postgres.abcdefghijkl`).

You don't need to create any tables. Flyway does that when the API starts.

### 2. API on Render

1. Push this repo to GitHub, then at [render.com](https://render.com) choose **New → Blueprint** and pick the repo. Render reads `render.yaml`.
2. Fill in the environment variables it asks for:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `jdbc:postgresql://<pooler host>:5432/postgres?sslmode=require` |
| `DATABASE_USERNAME` | the pooler user, e.g. `postgres.abcdefghijkl` |
| `DATABASE_PASSWORD` | your Supabase database password |
| `CORS_ORIGINS` | your Vercel address, e.g. `https://leavewise.vercel.app`. Put `https://leavewise.vercel.app,https://*.vercel.app` to allow preview deployments too. |

`JWT_SECRET` is generated for you. The first deploy takes a few minutes. When it's done, open `https://<your-service>.onrender.com/api/health`, which should show `{"status":"ok"}`.

On Render's free plan the API goes to sleep after 15 minutes without traffic, and the first request after that takes up to a minute. The sign-in page tells users when this is happening. Before a demo, open the health URL once to wake it up.

Optional settings: `DEMO_LOGIN=false` hides the sample-account buttons' backend, `SEED_DEMO_DATA=false` stops the sample team being added to an empty database, `DEMO_PASSWORD` changes the sample accounts' password.

### 3. Web app on Vercel

1. At [vercel.com](https://vercel.com) choose **Add New → Project** and import the repo.
2. Set **Root Directory** to `frontend`. The build settings come from `frontend/vercel.json`.
3. Add the environment variable `API_URL` = your Render address, e.g. `https://leavewise-api.onrender.com` (no trailing slash).
4. Deploy. If your Vercel address differs from what you put in `CORS_ORIGINS` on Render, update it there.

## Configuration reference

| Variable | Default | Used for |
|---|---|---|
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/leavewise` | JDBC address of PostgreSQL |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` | `postgres` / `postgres` | database login |
| `JWT_SECRET` | a development value | signs sign-in tokens; at least 32 characters in production |
| `CORS_ORIGINS` | `http://localhost:4200` | comma-separated web addresses allowed to call the API |
| `DEMO_LOGIN` | `true` | allows the one-click sample accounts |
| `DEMO_PASSWORD` | `leavewise123` | password given to the sample accounts |
| `SEED_DEMO_DATA` | `true` | adds the sample team when the database has no users |
| `PORT` | `8080` | set automatically by Render |
| `API_URL` (Vercel) | `http://localhost:8080` | where the web app sends API calls |
