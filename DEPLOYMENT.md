# Orello Admin — Vercel and Supabase deployment

This package deploys **only the Admin interface**. The tracker/plugin interface (`ui.html`, `ui.js`, `ui-supabase.js`, and `ui.css`) is deliberately excluded because Admin does not load those files.

## 1. Deploy Admin to Vercel

1. Extract this ZIP.
2. Commit this folder to a Git repository and import that repository in Vercel.
3. Choose **Other** / static site as the framework preset.
4. Leave the build command empty and use the folder containing `vercel.json` as the root directory.
5. Deploy a Preview first.
6. Check `/` and `/admin`; both should show the Admin page.
7. After testing, deploy to Production and note the exact production domain.

The included `vercel.json` routes `/` and `/admin` to `admin.html`.

## 2. Configure Supabase Auth URLs

In Supabase Dashboard, open **Authentication → URL Configuration**.

- Set **Site URL** to the canonical production origin, for example `https://YOUR-PROJECT.vercel.app/`. Replace the example with your real domain.
- Add the exact redirect URLs used by your app. The current Admin code sets `emailRedirectTo` from `location.origin + location.pathname`, so allow the path from which users start signup.

Example entries (replace the placeholder domain):
- `http://localhost:5500/`
- `http://localhost:5500/admin.html`
- `https://YOUR-PROJECT.vercel.app/`
- `https://YOUR-PROJECT.vercel.app/admin`
- `https://YOUR-PROJECT.vercel.app/admin.html`

For preview deployments, add a narrowly scoped Vercel preview pattern only if you need it, following Supabase's current redirect URL guidance. Prefer exact production URLs.

## 3. Test before production

Use a test account and test workspace.

- Admin page loads with styles and no fatal console errors.
- Sign up and receive the confirmation email.
- Confirmation link returns to the intended Admin URL.
- Sign in and sign out work.
- Workspace creation and membership loading work.
- Invitation creation and the `send-invite` Edge Function work.
- Projects can be created and statuses updated.
- Reports load for authorized users.
- A normal member cannot access owner/admin-only data.

## 4. Supabase resources

The Admin code uses the existing Supabase project and these resources:
- Tables: `team_members`, `teams`, `project_invitations`, `projects`, `time_sessions`, `profiles`
- RPCs: `accept_team_invitation`, `create_team`
- Edge Function: `send-invite`

Vercel hosts the static Admin frontend. It does not deploy the Supabase tables, policies, RPCs, or Edge Function. Confirm those resources exist in Supabase and that Row Level Security policies enforce permissions.

## Security

Never put a Supabase service-role key or other secret in browser code. Use only the publishable/anon key in the frontend, and validate access through Supabase Row Level Security.
