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

- **Path aliases**: the frontend uses `#`-prefixed TS path aliases (`#api`, `#components`, `#context`, `#hooks`, `#lib`, `#pages`, `#router`, `#types`, etc.), declared in both `vite.config.ts` and `tsconfig.app.json`. Keep these two files in sync when adding a new aliased directory. Runtime utilities (csv, markdown, plural, session/refresh, save-location helpers) live in `src/lib/`; `src/types/` holds only type declarations (`.d.ts`).
- **API layer** (`src/api/*Api.ts`): one file per backend resource, thin axios wrappers reading `VITE_API_URL` from env. No shared axios instance/client — each file imports the global `axios` directly and relies on `axios.defaults.headers.common.Authorization` being set elsewhere.
- **Auth**: `context/AuthProvider.tsx` owns token/user state and sets the global axios auth header. **The access token and the user object are deliberately never persisted** — they live only in React state + `axios.defaults.headers.common.Authorization`, so an XSS payload has nothing to read out of storage. The session survives a reload purely via the httpOnly refresh cookie: on mount `AuthProvider` calls `/auth/refresh` + `/auth/me` and only then flips `authReady`. Don't reintroduce `localStorage`/`sessionStorage` writes for auth state. `lib/sessionRefresh.ts` installs a response interceptor that transparently retries a request once after a 401 by calling `/auth/refresh` (queues concurrent 401s while one refresh is in flight), and signals `AuthProvider` to log out on refresh failure. When touching auth, keep these two files consistent — both mutate the same axios default header.
- **`authReady` is the gate, not `token`**: because `token` is null on the very first render for *every* visitor, any component that branches on `token`/`user` must render `<FullScreenLoader />` while `!authReady` first — otherwise the login form flashes for users whose session is still being restored. `PrivateRoute.tsx` and `LoginPage.tsx` both do this; follow the pattern in any new route-level guard.
- **Routing/authorization**: `router/AppRouter.tsx` defines routes; `router/PrivateRoute.tsx` redirects to `/login` if unauthenticated, or to `/` if the user's role isn't in an optional `allowedRoles` list. Role names are compared case-insensitively via `.toLowerCase()`, mirroring the backend's `requireRoles`.
- **Feature modules** under `components/<Feature>/` (Exams, Medications, Procedures, HomeCare, Specialists) follow the same three-component shape: a `Search<Feature>` autocomplete box, a `Selected<Feature>sTable` for chosen items, and a `<Feature>Manager` (admin CRUD). The Search*/Selected* pairs are thin wrappers over the shared generics `components/SearchPicker.tsx` (debounced, race-safe, keyboard/ARIA combobox) and `components/SelectedChips.tsx` (chip list + edit/remove) — build a new feature by configuring these, not by copy-pasting a sibling.
- **Reports**: `components/ReportForm/` builds the patient report ("рекомендаційний лист") UI; export goes through `html/generateReportHtml.ts` (standalone HTML with embedded Noah fonts from `src/fonts/`) and `docx/appendReportToDocx.ts` (appends to a patient's `.docx` card via jszip + File System Access API — Chrome/Edge only). There is no PDF pipeline anymore.

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
- **Dialogs go through the shared primitives**: `components/Modal.tsx` is the modal shell (overlay, enter animation, Escape/backdrop close, focus trap, `aria-modal`, `data-autofocus` support) — `ConfirmModal`, `PatientFormModal` and `ReferenceItemModal` are built on it; never hand-roll an overlay. `window.confirm` is still fine for quick synchronous destructive prompts (e.g. deleting a report stage); use `ConfirmModal` when the action is async and needs an in-progress state (`isLoading`/`loadingLabel`).
- **User feedback goes through `react-hot-toast`** (`toast.success`/`toast.error`) for form submit results; `lib/globalErrorHandling.ts` shows a generic Ukrainian toast for any unhandled non-401 axios rejection. Prefer a toast over `alert` for non-blocking success/error feedback (reserve `window.alert`/`confirm` for synchronous blocking prompts as in `CRUDManager`). Always import from `"react-hot-toast"` — never from `"react-hot-toast/headless"`, which is a separate bundle with its own store whose dispatches never reach the `<Toaster />` in `App.tsx` (ESLint `no-restricted-imports` blocks it).
- **Styling: Tailwind utilities + the design system in `src/index.css`** (the only global stylesheet; `App.css` is a dead legacy file). Brand tokens live in `@theme`: olive `brand` `#3d4025`, `paper`/`surface`/`surface-2`, `line`, `ink`/`ink-soft`, `danger` `#96412f`, `sage`, plus motion tokens (`--duration-fast/base/modal`) and the Noah brand font. Use these tokens and the component classes (`.btn` + `.btn-primary/-tint/-ghost/-danger/-danger-soft/-link`, `.field-input`, `.card`, `.chip-row`, `.list-row`, `.tab-pill`, `.pill`, `.panel-title`, `.sub-label`, `.modal-title`, `.skeleton`, `.anim-rise`, `.logo-mask`…) — never raw Tailwind palette colors (`green-*`, `amber-*`, `red-*` are the pre-redesign scheme and must not come back).
- **CSS cascade caution**: the global `button` reset in `@layer base` (index.css) must stay free of `!important` — for important declarations the layer order inverts, so `!important` in `base` would silently override even `!important` in `@layer components` (this bug once disabled the whole `.btn` recipe set). Compact buttons opt out of the reset via `.icon-btn`/`.toolbar-btn`/`.chip-remove` or `min-h-0`.
- **Shared UI primitives** in `src/components/`: `Modal`, `Spinner` (async buttons: `disabled` + `<Spinner />` + «Дієслово…»), `FullScreenLoader`, `icons.tsx` (IconEdit/IconClose/IconSearch/IconPlus), `SearchPicker`, `SelectedChips`; hooks: `useDebouncedValue`; utils: `#lib/plural` for Ukrainian pluralization. Reach for these before writing new one-off markup.
- **Copy standards**: Ukrainian apostrophe is `ʼ` (U+02BC), ellipsis is `…` (U+2026), in-progress labels are verb + `…` («Зберігаємо…»).
- **Pages are lazy-loaded directly in `router/AppRouter.tsx`** (`React.lazy` per page, for code-splitting). The `pages/index.ts` barrel is legacy and unused — do not import pages through it; add new pages as lazy imports in `AppRouter.tsx`.
- **Error boundary**: `ErrorBoundary.tsx` is a class component (required for `componentDidCatch`) wrapping the app and rendering `ErrorPage` on failure — this is the one place a class component is expected; don't convert it to a hook-based approach (React has no hook equivalent for `componentDidCatch`).

## Known issues (do not silently "fix" without asking)

- Self-registered users with role `"user"` currently bypass the admin-approval flow and get unrestricted access to patients/reports endpoints — role/permission tightening here is a deferred task, not an oversight to patch opportunistically.

## Data safety

No backup exists for the MongoDB database used by this project. Never run bulk delete/update operations against it without first listing the matching documents and getting explicit confirmation.
