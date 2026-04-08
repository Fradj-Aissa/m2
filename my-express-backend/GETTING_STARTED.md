# 🚀 GETTING STARTED CHECKLIST (PostgreSQL Only)

Firestore has been fully removed. Follow these steps to stand up the backend with PostgreSQL and the modular migration runner.

---

## ✅ Prerequisites
- PostgreSQL 12+ installed and running.
- `psql` available on your PATH.

## 1) Create Database
```bash
psql -U postgres -h localhost
CREATE DATABASE smartrent_db;
\q
```

## 2) Configure Environment
```bash
cd my-express-backend
cp .env.example .env
```
Edit `.env`:
```
DB_USER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE
DB_NAME=smartrent_db
PORT=3000
NODE_ENV=development
```

## 3) Install Dependencies
```bash
npm install
```

## 4) Apply Base Schema (tables, indexes)
```bash
psql -U postgres -d smartrent_db -f schema.sql
```

## 5) Run Modular Migrations
```bash
npm run db:init
```
This runs any pending files in `database/migrations/` and records them in `schema_migrations`.

## 6) Start the API
```bash
npm run dev
```
Server listens on `http://localhost:3000`.

## 7) Quick Health Checks
```bash
curl http://localhost:3000/health
curl http://localhost:3000/test-db
```

---

### Troubleshooting
| Issue | Fix |
|-------|-----|
| `psql: command not found` | Install PostgreSQL or add it to PATH |
| `ECONNREFUSED` to DB | Ensure PostgreSQL is running and creds match `.env` |
| `relation ... does not exist` | Re-run `schema.sql`, then `npm run db:init` |
| Port 3000 in use | Change `PORT` in `.env` or stop the other process |

---

### Key Files
- `schema.sql` – core tables and indexes
- `database/migrations/*.js` – incremental migrations (tracked)
- `database/init-db.js` – migration runner
- `index.js` – Express entry point
- `routes/` – REST endpoints
- `.env` – runtime configuration
