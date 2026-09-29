# Tamago

Dispatch & invoicing demo: FastAPI + PostgreSQL + React/TypeScript, with a DB-backed task queue and worker. See docs/SPEC.md.

## Run (backend)

```
docker compose up -d db s3
python3 -m venv .venv && .venv/bin/pip install -e "backend[dev]"
cd backend && ../.venv/bin/alembic upgrade head
../.venv/bin/uvicorn app.main:app --port 8390     # API
../.venv/bin/python -m app.worker                 # worker (separate process)
../.venv/bin/pytest                               # tests (uses tamago_test DB)
```

Completing a job commits a `job.status_changed` task in the same transaction (outbox). The worker
claims tasks with `FOR UPDATE SKIP LOCKED`, retries with exponential backoff, reaps tasks from
crashed workers, and generates the invoice PDF (stored in S3) idempotently.

## Run (frontend)

```
cd frontend && npm install
npm run dev        # http://localhost:5180 (proxies /api to the backend on :8390)
npm test           # vitest
npm run lint       # oxlint (+ @shadcn/lint plugin registered, no rules enabled yet)
npm run build
python scripts/seed.py   # optional demo data (API must be running)
```

Design: `docs/design/tamago.pen` (Pencil) and PNGs in `docs/design/screens/`.
