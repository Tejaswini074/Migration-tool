# DataBridge

Enterprise-grade database migration platform. Connect a source and destination database live (no credentials ever stored, except for the one narrow scheduling exception below), map tables/columns with auto-suggested matches, validate before you run, and migrate with per-row retry, failure tracking, and full audit history.

Two independent apps in one repo:

- **`server/`** — Express 5 + TypeScript API, MySQL-backed (its own metadata database, separate from whatever you're migrating).
- **`client/`** — React 19 + TypeScript + Vite + Tailwind v4 SPA.

## Quick start

Prerequisites: Node 18+, a MySQL server reachable for the app's own metadata database (the databases you actually migrate can be MySQL or PostgreSQL — see [Connectors](#connectors)).

```bash
# Backend
cd server
npm install
cp .env.example .env   # fill in the values, see below
npm run dev             # http://localhost:5000

# Frontend (separate terminal)
cd client
npm install
npm run dev              # http://localhost:5173
```

Open the frontend URL. The very first account you create becomes an admin (one-time bootstrap); every account after that signs up as a regular user.

### Backend environment variables (`server/.env`)

| Variable | Required | Notes |
|---|---|---|
| `PORT` | no | defaults to `5000` |
| `APP_DB_HOST`/`PORT`/`USER`/`PASSWORD`/`NAME` | yes | DataBridge's own metadata database (users, projects, mappings, run history). Created automatically on first boot if it doesn't exist. |
| `JWT_SECRET` | yes | long random string, signs auth tokens |
| `JWT_EXPIRES_IN` | no | defaults to `1d` |
| `CREDENTIAL_ENCRYPTION_KEY` | only for Schedules | 32-byte base64 key. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Encrypts the source/destination credentials a schedule needs to run unattended — the one place DataBridge persists DB credentials. |
| `CORS_ORIGIN` | no | comma-separated allowlist of frontend origins. Unset reflects the request origin (fine for local dev; set explicitly in production). |

### Frontend environment variables (`client/.env`, optional)

| Variable | Notes |
|---|---|
| `VITE_API_BASE_URL` | defaults to `http://localhost:5000/api` |

## What it does

- **Connect** to a source and destination database (MySQL or PostgreSQL) with live credentials — nothing is persisted from a manual connection.
- **Map** tables and columns, with auto-suggested matches based on name/column similarity (`recommendation` module) and a preview of transformed sample data before committing.
- **Transform** columns in flight: uppercase/lowercase/trim, default-if-null, number/string casting, date reformatting, regex replace.
- **Validate** before running: missing required fields, duplicate values on unique/PK columns, out-of-project foreign keys, circular table dependencies.
- **Migrate** with FK-aware table ordering, configurable batch size, per-row retry-then-skip (never aborts a whole table for one bad row), and a downloadable CSV/PDF report.
- **Schedule** a saved project to run on a cron cadence, full or incremental (only-new-rows, tracked via a per-table "high water" column).
- **Get notified** via webhook when a run finishes or fails.
- **See an overview**: stats, a rows-migrated trend chart, and recent run activity.
- Every project, mapping, and run is scoped to the user who created it; admins see everything.

## Architecture

### Connector abstraction (`server/src/connectors/`)

All schema reading, batch reads/inserts, and FK introspection go through the `IConnector` interface — `MySqlConnector` and `PostgresConnector` both implement it, translating their native metadata into the same shape (`ColumnInfo`, `ForeignKeyInfo`) so the validation and migration engines never need to know which database type they're talking to. `connectorFactory.ts` picks the implementation from a `type` field on the connect request. CSV import is designed for but not yet built.

### Live connections, not stored credentials

`connectionManager` holds active `IConnector` instances in memory, keyed by a random connection id and tagged with the user who opened them (`getOwned()` enforces that tag on every read). Nothing about a manual connection — not even the host or username — is written to disk. The **one exception** is the Schedules feature: since an unattended cron job can't ask a human to reconnect, a schedule's source/destination credentials are AES-256-GCM encrypted at rest (`server/src/lib/crypto.ts`, key from `CREDENTIAL_ENCRYPTION_KEY`).

### App's own metadata database

Users, projects, table/column mappings, run history, failed-row logs, notification settings, and schedules all live in DataBridge's own database (`APP_DB_NAME`) — never on whichever external database you happen to be migrating. Every table is created lazily on first use (`ensureTables()` in each service), so there's no separate migration/seed step.

### Per-user scoping

Every project/run/schedule row carries a `created_by_user_id`. Regular users only ever see their own; admins see everyone's. This is enforced server-side (a `getAccessibleProject`/`getAccessibleRun`/`getAccessibleTableMapping`/`getOwnedSchedule` check on every relevant endpoint returns 403/404 as appropriate), not just hidden in the UI.

### Migration engine (`server/src/migration/migration.service.ts`)

Tables run in FK-dependency order (topological sort, with cycle detection surfaced during validation). Rows are read in configurable batches (50–5000, default 500); each row that fails to insert gets two retries with backoff, then is logged to `migration_failed_rows` and skipped — one bad row never aborts the whole table. Source auto-increment IDs are remapped to their new destination IDs in memory so FK-referencing tables migrated later can look them up.

### Security

See the checklist below — the short version is that every endpoint accepting an id for a connection, project, run, table mapping, or schedule verifies the requester owns it (or is admin) before touching anything, table/column names are restricted to a safe charset before reaching SQL, webhook URLs can't target internal/loopback addresses, and auth endpoints are rate-limited.

## Folder structure

```
server/src/
  auth/            signup/login/JWT, user management, role middleware
  connectors/       IConnector, MySqlConnector, PostgresConnector, factory
  database/        connect/disconnect endpoints, connectionManager (owned, in-memory)
  schema/          table/column/FK introspection over a live connection
  recommendation/  auto-suggests table/column matches between source and destination
  Mapping/         projects, table/column mappings, transform preview, high-water config
  validation/      pre-flight checks before a migration run
  migration/       the migration engine, transform engine, run history, PDF/CSV reports
  notifications/   per-user webhook settings, fired on run completion
  schedule/        cron-backed recurring migrations, encrypted credential storage
  lib/             crypto, identifier/URL validators shared across modules
  config/          app metadata database connection pool

client/src/
  pages/           one file per top-level view (Overview, Migration wizard, Projects, History, Schedules, Settings, Admin)
  components/      Sidebar, wizard steps (ConnectionCard, MappingReview, ValidationReport, MigrationProgress), TransformEditor
  components/ui/   design-system primitives (Card, Button, Input, Select, Badge, ThemeToggle)
  hooks/           one hook per page/concern, own the API calls + state; components stay close to pure JSX
  services/        axios client + one function per API endpoint (dataBridgeApi.ts, authApi.ts)
  types/           shared TypeScript types matching the API's response shapes
```

## API map

All routes are prefixed `/api` and require a `Authorization: Bearer <token>` header except `/auth/*`.

| Prefix | Purpose |
|---|---|
| `/auth` | bootstrap-status, register (first admin), signup, login, me, admin user management |
| `/database` | connect, disconnect, list your active connections |
| `/schema` | tables/columns/foreign-keys/full schema for a connection |
| `/recommendation` | auto-suggest table/column matches |
| `/mapping` | projects, table/column mappings, transform preview, high-water column |
| `/validation` | pre-flight checks for a project |
| `/migration` | run, status, stats, history, failed rows, report download |
| `/notifications` | your webhook settings |
| `/schedules` | create/list/toggle/delete/run-now recurring migrations |

## Security checklist (what's already handled)

- Live connections are owned by the user who opened them; no cross-user access via a guessed connection id.
- Every project/run/table-mapping/schedule endpoint verifies ownership server-side before reading or writing.
- Table/column names are restricted to `[A-Za-z0-9_]` before reaching SQL (identifiers can't be parameterized).
- Webhook URLs can't target localhost/loopback/link-local/cloud-metadata addresses.
- Login/signup/register are rate-limited (20/15min per IP).
- Security headers via `helmet`; CORS origin is configurable per environment.
- Passwords are bcrypt-hashed; JWTs are short-lived and signed with a server secret.
- Scheduled-run credentials are the only credentials persisted anywhere, and they're AES-256-GCM encrypted.

**Known, accepted gaps** (documented rather than silently ignored):
- The webhook URL guard checks the literal hostname, not the resolved IP — a domain that *resolves* to a private address (DNS rebinding) isn't caught.
- `regex_replace` transform patterns are checked for valid syntax but not for catastrophic-backtracking (ReDoS) risk — acceptable since a transform only ever runs against a user's own data during their own migration.

## Known follow-ups

- CSV import connector (interface is ready, not implemented).
- Email notifications (webhook-only for now — no SMTP configured).
- Table/column name validation is charset-based, not schema-verified against the actual connected database.
