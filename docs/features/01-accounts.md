# Accounts: sign up, sign in, admin

**Status:** shipped in M0.

## What users see

- **Sign up** (`/sign-up`): full name, email, password (8+ characters) with a live strength
  meter. The browser's time zone is saved, so the daily job search runs at your morning. On
  success you land on Home.
- **Sign in** (`/sign-in`): email *or* username, and password. Show/hide password. Errors are
  specific but never reveal whether an account exists.
- **Home** (`/`): until your CV and job preferences exist, a three-step **Get started**
  (upload your CV or start from scratch, set your job preferences, see your jobs).
- **Account menu** (bottom of the side rail; the avatar on phones): Account settings, Admin
  (administrators only) and Sign out. Light/dark and the colour palette live in the
  **Appearance** picker next to it (see [settings](09-settings-admin.md)).

The sign-in panel shows a CV being measured against sample jobs: the match tape, and the
lines that get rewritten for each job. It explains the product before anyone signs up.

## Limits and the demo account

- Sign-in: 10 attempts per address and identifier every 15 minutes (`rate_limited`).
- Anything that checks your current password (changing it, deleting the account): 5 tries
  per account every 15 minutes, so a stolen session can't guess it.
- The shared demo account (`is_demo`, see [the demo](09-settings-admin.md#the-demo-make-demo))
  can't change its password (`demo_account`), sign other devices out, be deleted, or be made
  an administrator, so the next visitor finds it as you did.

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
| `PATCH` | `/api/v1/auth/me` | Update name, time zone, theme, palette, digest, onboarding step |
| `POST` | `/api/v1/auth/password` | Change password; signs out other devices |
| `GET` | `/api/v1/auth/sessions` | Where you're signed in (device, address, last active) |
| `POST` | `/api/v1/auth/sessions/sign-out-others` | Sign out every other device |

Error codes: `email_taken` (409), `bad_credentials` (401), `rate_limited` (429),
`validation_error` (422), `bad_origin` (403), `demo_account` (403).

## Data

`users`: email (unique), username (unique, optional), role, name, password hash (Argon2id),
time zone, theme (`system`, `light`, `dark`), palette (`tape`, `lagoon`, `orchid`, `fern`),
onboarding step, digest preference, AI switch and daily allowance, flags (`is_active`,
`is_demo`).
`sessions`: SHA-256 of the token, expiry, last use, user agent, IP. Expired sessions are purged
nightly at 03:17 UTC by `auth.purge_expired_sessions`.

## Tests

`backend/tests/integration/test_auth.py`: registration, validation, duplicates, sign-in by
email and username, vague errors, rate limiting, admin seeding (idempotent), profile updates,
password change, origin check, session endpoint, health.
