# ENVIRONMENT.md — Environment Variable Configuration

## 1. Required & Optional Environment Variables

All variables are documented in `.env.example`.

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `NODE_ENV` | Optional | `development` | Runtime environment (`development`, `test`, `production`) |
| `PORT` | Optional | `3000` | Port for the HTTP server |
| `APP_URL` | Required | `http://localhost:3000` | Publicly reachable URL of the application |
| `DATABASE_URL` | Required for DB | `postgresql://...` | Connection string to PostgreSQL database |
| `DATABASE_POOL_SIZE` | Optional | `10` | Max active connections in PostgreSQL connection pool |
| `AUTH_SECRET` | Required (Phase 2) | Random 32+ string | Signing secret for session tokens |
| `AUTH_EXPIRY` | Optional | `7d` | Lifetime of access tokens |
| `STORAGE_DRIVER` | Optional | `local` | Storage provider (`local`, `s3`, `gcs`) |
| `SMTP_HOST` | Optional | `smtp.mailtrap.io` | Outbound email gateway host |
| `SMS_PROVIDER` | Optional | `twilio` | SMS notification provider |
| `LOG_LEVEL` | Optional | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`) |

## 2. Security Rules
* Never commit real production secrets to `.env.example` or repository.
* In Cloud environments, inject secrets through runtime secret managers.
