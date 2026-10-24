# ABC Copilot frontend

React, TypeScript, Vite and shadcn-style UI components for the initial authentication, onboarding and role-aware workspace.

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or Supabase publishable key). These are browser client settings; never put a Supabase service-role/secret key in this file.
3. Set `VITE_API_URL` to the backend API, normally `http://localhost:5000/api`.
4. Start the backend from `abc-backend` with `npm run dev`.
5. Start this app with `npm run dev`, then open `http://localhost:5173`.

In Supabase Auth URL Configuration, allow `http://localhost:5173/auth/callback`. Google and email sign-in, email verification, invitations and password reset all return through that URL.

Pages use the `src/pages/` groupings discussed for the MVP. Reusable Supabase/API calls live in `src/services/`, auth and permissions in `src/hooks/`, and shadcn-style primitives in `src/components/ui/`.
