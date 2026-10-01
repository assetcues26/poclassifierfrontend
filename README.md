# PO Classification Batch UI — Frontend

React (Vite, JSX) UI to upload PO Excel files, watch batch progress, review results, and download combined JSON. Talks only to the FastAPI backend — never to Azure directly.

## Prerequisites

- Node.js 18+
- Backend running (see `../backend/README.md`)

## Setup

```powershell
cd PO_classifcationUI\frontend
copy .env.example .env
npm install
npm run dev
```

Open **http://localhost:5173** (prefer `localhost`, not `127.0.0.1`).

## Env vars

Copy from `.env.example`. Never put passwords, hashes, Azure URLs, or function keys here.

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL (local: `http://localhost:8000`) |
| `VITE_POLL_INTERVAL_MS` | Progress poll interval while a job is running |
| `VITE_PAGE_SIZE` | PO list page size |
| `VITE_APP_TITLE` | Header title |

### Local cookie note

The backend session cookie only works if the browser host and API host match.

- Good: UI `http://localhost:5173` + `VITE_API_BASE_URL=http://localhost:8000`
- Bad: UI on `localhost` + API on `127.0.0.1` (upload will 401 and look like a logout)

After changing `.env`, restart `npm run dev`.

## Auth (UI)

1. Login screen asks for username + password (credentials live on the backend)
2. Browser stores an HttpOnly session cookie from the API
3. All API calls use `credentials: "include"`
4. Log out clears the cookie; expired sessions return to the login screen

You do not configure users in the frontend.

## Scripts

```powershell
npm run dev      # local Vite server
npm run build    # production build → dist/
npm run preview  # preview production build
```

## Deploy (Vercel)

1. Build command: `npm run build`
2. Output: `dist`
3. Set `VITE_API_BASE_URL` to your Render backend URL (public HTTPS)
4. Ensure the backend `CORS_ORIGINS` includes your Vercel origin
5. On Render, use `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true` for cross-site cookies

## Security

- `.env` is gitignored; commit `.env.example` only
- No `VITE_` variable should hold secrets (Vite embeds them in the browser bundle)
- Authentication and Azure access are entirely backend responsibilities
