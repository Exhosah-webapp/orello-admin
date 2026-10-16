# Orello Admin

This package is **only the Orello Admin web interface**. It intentionally excludes `ui.html` and the tracker/plugin assets. Those belong to the separate plugin interface and are not required by Admin.

## Files

- `admin.html` — Admin page and authentication entry point
- `css/admin.css` — Admin styles
- `js/admin.js` — Admin logic and Supabase calls
- `vercel.json` — Vercel routes `/` and `/admin` to `admin.html`
- `DEPLOYMENT.md` — Vercel and Supabase setup notes

## Run locally

Open this folder in VS Code and use Live Server or another local HTTP server. The Admin page uses the Supabase JavaScript CDN client directly; it does not load the plugin's `ui.html`, `ui.js`, or bundled `ui-supabase.js`.

## Scope

The Admin page retains the existing authentication and Supabase operations. The plugin/tracker interface should be deployed and maintained separately if it needs its own URL or hosting configuration.

## Security

The browser uses a Supabase publishable key. Never place a Supabase service-role key or server secret in HTML/JavaScript. Supabase Row Level Security must enforce access controls.
