# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Google / Apple sign-in (Supabase OAuth)

After OAuth, users return to your **Site URL** (same origin as the app, e.g. `http://localhost:5173`). The app then redirects signed-in users to `/dashboard`.

### If you see `HTTP ERROR 400` from `*.supabase.co`

Supabase rejects OAuth when **`redirect_to` is not allowlisted**. Fix:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication → URL Configuration**.
2. Set **Site URL** to your app origin (e.g. `http://localhost:5173` for Vite dev).
3. Under **Redirect URLs**, include the **exact** URL you use in the browser:
   - `http://localhost:5173` **and** `http://127.0.0.1:5173` if you switch between them (they are different hosts).
4. Optional: set `VITE_AUTH_REDIRECT_URL` in `.env` to a full URL that matches one redirect URL entry exactly.

Also enable **Google** under **Authentication → Providers**. In **Google Cloud Console**, the OAuth client’s authorized redirect URI must be Supabase’s callback (shown in the Google provider settings on Supabase), not your app URL.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
