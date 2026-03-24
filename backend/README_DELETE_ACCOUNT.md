# Account deletion (Supabase)

The backend implements secure account deletion using **Supabase** (Postgres + Auth + Storage), not Firebase.

## Requirements

1. **Supabase project** with Auth enabled.
2. **Service role key** in `backend/.env`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`  
   **Never** commit the service role key or expose it to the frontend.
3. **Table `public.account_deletions`** — run the SQL in `docs/supabase_schema.sql` (section *Account deletion tokens*) if you have not already.
4. **Email** (SMTP or SendGrid) so users receive the confirmation link — see `emailService.js` and `.env.example`.

## Flow

1. `POST /api/account/delete-request` with `{ uid, email }` creates a row in `account_deletions` and emails a link:  
   `{FRONTEND_URL}/delete-account-confirm?token=...`
2. `POST /api/account/delete-confirm` with `{ token }` deletes:
   - `profiles`, `analysis_history`, `feedback`, `weather_alerts` (best-effort)
   - Storage objects under `avatars`, `crop-images`, `feedback-screenshots` for that user
   - The Supabase Auth user (`auth.admin.deleteUser`)

## Troubleshooting

- **`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` missing** — server may fail to start if `supabaseAdmin.js` throws; set variables or adjust that module for optional admin.
- **Insert into `account_deletions` fails** — confirm the table exists and the service role key is correct.
- **Email not received** — configure `SMTP_*` or `SENDGRID_API_KEY`; in development the API may log the deletion link in the console.
- **`535 Authentication failed` / `Invalid login` (Gmail)** — use a **Google App Password** (Account → Security → 2-Step Verification → App passwords), not your normal Gmail password. Regenerate if it was revoked. Prefer `EMAIL_FROM` = same address as `SMTP_USER` for Gmail.
