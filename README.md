# CBS Console — Frontend

Employee console for the Core Banking System (CBS) backend. Built with Next.js 15 (App Router) + TypeScript + Tailwind.

## 1. Scaffold (this is what was run to create the project shape)

```bash
npx create-next-app@latest cbs-frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias "@/*"
```

When prompted:
- Would you like to use Turbopack? → Yes
- Would you like to customize the default import alias? → No (use `@/*`)

Then the files in this folder (`app/`, `components/`, `lib/`, `types/`, `middleware.ts`) replace/extend the generated skeleton.

## 2. Install

```bash
cd cbs-frontend
npm install
npm install lucide-react jwt-decode
```

## 3. Configure

Create `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
```

This must match the CBS backend's `server.servlet.context-path` + host/port (see `sample_application.yaml.txt` in the backend — default is `localhost:8080/api/v1`).

## 4. Run

```bash
npm run dev
```

Visit `http://localhost:3000` → redirects to `/login`.

## What's implemented

- **`/login`** — single employee login screen. Calls `POST /auth/login`, stores the JWT + role in cookies, and:
  - if `mustChangePassword` is `true`, redirects to `/change-password` (must be completed before anything else, matching `AuthService.login()`'s contract).
  - otherwise redirects to `/dashboard`.
- **Hamburger navigation** (`components/Sidebar.tsx`) — a slide-in drawer ("the ledger") containing every operational module exposed by the backend's controllers, filtered by the signed-in user's role using the same authority strings the backend's `@PreAuthorize` checks use (`SUPER_ADMIN`, `ADMIN`, `CUSTOMER_SERVICE`, `TELLER`, `AUDITOR`).
- **`middleware.ts`** — guards every `/dashboard/**` route; no token cookie → bounce to `/login`.
- Module pages (`customers`, `accounts`, `transactions`, `cards`, `loans`, `users`) are wired to the matching REST endpoints in `controller/` and render real data — list/search/create flows for the ones the backend exposes as plain JSON endpoints.

## Role → menu map (mirrors backend `@PreAuthorize`)

| Module | Roles allowed |
|---|---|
| Customers | SUPER_ADMIN, ADMIN, CUSTOMER_SERVICE, TELLER, AUDITOR (read) |
| Accounts | SUPER_ADMIN, ADMIN, CUSTOMER_SERVICE, TELLER |
| Transactions | SUPER_ADMIN, ADMIN, TELLER |
| Cards | SUPER_ADMIN, ADMIN, TELLER |
| Loans | SUPER_ADMIN, ADMIN, TELLER |
| Users (employee accounts) | SUPER_ADMIN, ADMIN |
