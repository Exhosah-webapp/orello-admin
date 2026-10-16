# Orello split project

This folder contains the original Orello pages with their embedded CSS and JavaScript split into separate files.

## Structure

- `admin.html` — admin page
- `ui.html` — tracker page
- `css/admin.css` — admin page styles
- `css/ui.css` — tracker page styles
- `js/admin.js` — admin page application logic
- `js/ui.js` — tracker page application logic
- `js/ui-supabase.js` — bundled Supabase client used by the tracker page

## Run it

For a static local preview, open `ui.html` or `admin.html` in a browser. If authentication, database requests, or browser security rules prevent local-file operation, serve this folder using a local development server (for example, VS Code Live Server).

## Notes

- The existing Supabase CDN script on `admin.html` is preserved.
- Script order is preserved by placing the scripts at the original script positions and using `defer`.
- The supplied project contains JavaScript, not TypeScript source. No `.ts` file was added because TypeScript needs compilation or a build setup; converting the current JavaScript to TypeScript without checking its data shapes and APIs could introduce errors.
- The existing Supabase URL and publishable key are preserved as supplied. Never put a Supabase service-role key in browser code.
