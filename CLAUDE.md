# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A patient/report management app for a cosmetology practice ("kosmetolog_ui"). Monorepo with two independent npm projects, no shared root package.json:

- `backend/` — Express 5 + TypeScript + Mongoose (MongoDB), JWT auth with refresh tokens.
- `frontend/` — React 19 + TypeScript + Vite + Tailwind CSS 4.

There is no test suite configured in either project (no Jest/Vitest present) — do not assume `npm test` works.

## Commands

Run each from its respective directory (`backend/` or `frontend/`); there is no root-level script runner.

**Backend:**
- `npm run dev` — start with ts-node-dev (auto-restart, transpile-only, no type checking on run)
- `npm run build` — `tsc` compile to `dist/`
- `npm start` — run compiled `dist/server.js`
- `npm run seed` — run `src/seed.ts` to seed the database

**Frontend:**
- `npm run dev` — Vite dev server
- `npm run build` — `tsc -b && vite build` (type-checks before bundling)
- `npm run lint` — ESLint
- `npm run preview` — preview production build

Both projects require env files (`backend/.env`, `frontend/.env`) that are not committed. Backend fails fast at startup (`config/env.ts`) if `JWT_SECRET`, `JWT_REFRESH_SECRET`, or `MONGODB_URI` are missing. Frontend needs `VITE_API_URL` for the API base URL.

## Architecture

### Backend request flow

Every feature follows the same layered path: `routes/*.routes.ts` → `middlewares/validate.middleware.ts` (Joi) → `controllers/*.controller.ts` → `services/*.service.ts` (Mongoose queries) → `models/*Schema.ts`.

- **Auth**: `middlewares/auth.middleware.ts` decodes the JWT from the `Authorization: Bearer` header into `req.user` (`authMiddleware`), and `requireRoles(...roles)` gate-checks `req.user.role` (case-insensitive) against `"admin" | "doctor" | "user"`. Almost every route file calls `router.use(authMiddleware)` then layers `requireRoles` per-route.
- **Errors**: controllers catch and call `next(ApiError.badRequest/notFound/internal(...))` (all Ukrainian-language messages); `middlewares/errorHandler.ts` is the single place that turns an `ApiError` into a JSON response. Follow this pattern for new endpoints rather than throwing raw errors.
- **Validation**: Joi schemas live in `validators/*.validation.ts` and are wired in via `validate(schema, source)`; `utils/objectId.ts` provides `validateObjectIdParams` for Mongo ObjectId route params.
- **Reference/lookup data (exams, medications, procedures, specialists, home cares, categories)**: these are near-identical CRUD-over-a-name-list resources. `controllers/createReferenceController.ts` is a generic factory (`createReferenceController<T>(service, createFields)`) that each of these controllers wraps rather than reimplementing CRUD by hand — follow this factory pattern when adding another reference-style resource instead of writing a bespoke controller.
- **Registration/roles**: new users self-register via `/auth/register`; depending on the requested role this creates either a `User` directly or a pending `RegistrationRequest` (see `services/auth.service.ts` and `controllers/registrationRequests.controller.ts`) that an admin approves. See the known gap in role enforcement below.

### Frontend structure

- **Path aliases**: the frontend uses `#`-prefixed TS path aliases (`#api`, `#components`, `#context`, `#hooks`, `#pages`, `#router`, `#types`, etc.), declared in both `vite.config.ts` and `tsconfig.app.json`. Keep these two files in sync when adding a new aliased directory.
- **API layer** (`src/api/*Api.ts`): one file per backend resource, thin axios wrappers reading `VITE_API_URL` from env. No shared axios instance/client — each file imports the global `axios` directly and relies on `axios.defaults.headers.common.Authorization` being set elsewhere.
- **Auth**: `context/AuthProvider.tsx` owns token/user state, persists them to `localStorage`, and sets the global axios auth header. `lib/sessionRefresh.ts` installs a response interceptor that transparently retries a request once after a 401 by calling `/auth/refresh` (queues concurrent 401s while one refresh is in flight), and signals `AuthProvider` to log out on refresh failure. When touching auth, keep these two files consistent — the interceptor and the provider both mutate the same axios default header and localStorage keys.
- **Routing/authorization**: `router/AppRouter.tsx` defines routes; `router/PrivateRoute.tsx` redirects to `/login` if unauthenticated, or to `/` if the user's role isn't in an optional `allowedRoles` list. Role names are compared case-insensitively via `.toLowerCase()`, mirroring the backend's `requireRoles`.
- **Feature modules** under `components/<Feature>/` (Exams, Medications, Procedures, HomeCare, Specialists) each follow the same three-component shape: a `Search<Feature>` autocomplete/search box, a `Selected<Feature>sTable` for the chosen items, and a `<Feature>Manager` (admin CRUD) — mirror this shape for a new reference-data feature rather than inventing a new pattern.
- **Reports**: `components/ReportForm/` builds the patient report UI; `pdf/generateReportPDF.ts` renders it to PDF via jsPDF/jspdf-autotable using the bundled Noah fonts in `src/fonts/`.

## Code conventions

- **User-facing strings are Ukrainian.** Error messages (`ApiError`, Joi `.messages()`, ad-hoc `res.status(...).json({ message: ... })`) and UI copy are all in Ukrainian. Match this — don't switch to English for new messages.
- **Services are plain exported functions, not classes**, and mostly return the Mongoose query/promise directly (e.g. `Patient.find(filter)`) rather than awaiting inside the function — controllers chain `.sort()/.skip()/.limit()` onto what the service returns (see `patient.controller.ts` + `patient.service.ts`). Follow this shape for new services.
- **Controllers always try/catch and forward to `next(ApiError.xxx(...))`** — never let a rejected promise or thrown error reach Express unhandled, and never `throw` past a controller boundary.
- **Validation messages are centralized**: reuse `commonMessages` from `validators/common.ts` in new Joi schemas (`.messages(commonMessages)`) instead of writing one-off message strings, so error text stays consistent across validators.
- **Reference/lookup resources must go through `createReferenceController`/the shared service shape** (`getAll`, `searchByName`, `create`, `update`, `remove`) rather than a bespoke controller — see the Architecture section above.
- **Role checks are case-insensitive strings**, not an enum comparison — always `.toLowerCase()` a role before comparing, matching `requireRoles` (backend) and `PrivateRoute`/`AuthProvider` (frontend).
- **Frontend components import via `#`-aliases** (`#api/...`, `#components/...`, etc.), not relative `../../` paths outside a component's own folder.
- **ESLint is the source of truth for style** (quotes, semicolons, hooks rules) — run `npm run lint` in `frontend/` after touching frontend code rather than guessing formatting by hand; there's no Prettier config, so don't introduce one unprompted.
- **No test suite exists.** Don't invent Jest/Vitest config or write test files unless the user asks — verify changes by reading the code path and, where practical, running the dev servers.

## Component conventions (frontend)

- **Both `React.FC<Props>` and plain `function Component(props: Props)` appear in the codebase** — either is fine; don't do a drive-by conversion between them in unrelated changes.
- **Local state via `useState`, no global state library.** Cross-cutting state is exposed through React Context (`AuthContext`) + a `use*` hook wrapper (`useAuth`) that throws if used outside its provider — follow that same `XContext` + `useX` pattern for any new shared state instead of prop-drilling or adding a new state library.
- **Feature "Manager" components are self-contained**: they own their own fetch/create/update/delete calls (via axios directly or the matching `#api/*Api.ts` file), their own form state, and re-fetch the list after every mutation rather than optimistically updating local state. `CRUDManager.tsx` is the generic version driven by an `apiPath` prop + `mapItem`/`mapToApi` — thin wrappers like `ExamsManager.tsx` just configure it. Add a new reference-data manager by wrapping `CRUDManager`, not by copy-pasting its internals.
- **Confirmations use `window.confirm`/`window.alert`**, not a custom modal component, for destructive actions (e.g. delete) and import summaries. Keep using these unless the user asks for a real modal.
- **User feedback goes through `react-hot-toast`** (`toast.success`/`toast.error`) for form submit results; `lib/globalErrorHandling.ts` shows a generic Ukrainian toast for any unhandled non-401 axios rejection. Prefer a toast over `alert` for non-blocking success/error feedback (reserve `window.alert`/`confirm` for synchronous blocking prompts as in `CRUDManager`).
- **Styling is Tailwind utility classes inline in JSX** — no CSS modules, styled-components, or separate stylesheet per component (only `App.css`/`index.css` exist, for global styles). The color scheme is green-based (`green-50`...`green-900`) for primary UI, amber for edit actions, red for delete/destructive actions — reuse these instead of introducing new colors.
- **Barrel files**: `pages/index.ts` re-exports every page for `#pages/index` imports — add new pages to this barrel rather than importing page files directly by path.
- **Error boundary**: `ErrorBoundary.tsx` is a class component (required for `componentDidCatch`) wrapping the app and rendering `ErrorPage` on failure — this is the one place a class component is expected; don't convert it to a hook-based approach (React has no hook equivalent for `componentDidCatch`).

## Known issues (do not silently "fix" without asking)

- Self-registered users with role `"user"` currently bypass the admin-approval flow and get unrestricted access to patients/reports endpoints — role/permission tightening here is a deferred task, not an oversight to patch opportunistically.

## Data safety

No backup exists for the MongoDB database used by this project. Never run bulk delete/update operations against it without first listing the matching documents and getting explicit confirmation.
