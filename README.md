# xypa

Mongolian-market personal spending tracker PWA.

- `frontend/` — static PWA (React via Babel-standalone, no build step). Deployed to Vercel.
- `backend/` — Express API: Gmail OAuth + bank-alert email parsing. Deployed to Vercel as a serverless app, with the Gmail refresh token persisted in Postgres (`DATABASE_URL`) so the connection survives cold starts/restarts.

Push to `main` to deploy both.
