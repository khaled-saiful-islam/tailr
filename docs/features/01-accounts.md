# Accounts: sign up, sign in, admin

**Status:** shipped in M0.

## What users see

- **Sign up** (`/sign-up`): full name, email, password (8+ characters) with a live strength
  meter. The browser's time zone is saved for brief scheduling. On success you land on Today.
- **Sign in** (`/sign-in`): email *or* username, and password. Show/hide password. Errors are
  specific but never reveal whether an account exists.
- **Today** (`/`): until the profile exists, a setup path (account → profile → radar → first
  brief) and a sample brief showing what mornings will look like.
- **Account menu** (rail bottom / top-right on phones): appearance (device, light, dark) and
  sign out.

The sign-in panel shows a résumé being measured against jobs: the Fit tape, the chalk marks
that show where tailoring happens. It explains the product before anyone signs up.

## Default admin

On every start the backend makes sure an admin exists:

| Setting | Default |
|---|---|
| `SEED_ADMIN_USERNAME` | `admin` |
| `SEED_ADMIN_PASSWORD` | `admin` |
| `SEED_ADMIN_EMAIL` | `admin@tailr.local` |

The admin has `role = "admin"`. **Production refuses to start while the password is `admin`.**

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Create an account and sign in (201) |
| `POST` | `/api/v1/auth/login` | Sign in with `{identifier, password}` |
| `POST` | `/api/v1/auth/logout` | End this session |
| `GET` | `/api/v1/auth/session` | `{user}` or `{user: null}` |
| `GET` | `/api/v1/auth/me` | The signed-in user (401 if none) |
| `PATCH` | `/api/v1/auth/me` | Update name, time zone, theme, digest, onboarding step |
| `POST` | `/api/v1/auth/password` | Change password; signs out other devices |

Error codes: `email_taken` (409), `bad_credentials` (401), `rate_limited` (429),
`validation_error` (422), `bad_origin` (403).

## Data

`users`: email (unique), username (unique, optional), role, name, password hash (Argon2id),
time zone, theme, onboarding step, digest preference, flags.
`sessions`: SHA-256 of the token, expiry, last use, user agent, IP. Expired sessions are purged
nightly at 03:17 UTC by `auth.purge_expired_sessions`.

## Tests

`backend/tests/integration/test_auth.py`: registration, validation, duplicates, sign-in by
email and username, vague errors, rate limiting, admin seeding (idempotent), profile updates,
password change, origin check, session endpoint, health.
