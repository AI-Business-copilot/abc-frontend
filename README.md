# ABC Copilot frontend

React, TypeScript, Vite and shadcn-style UI components for the initial authentication, onboarding and role-aware workspace.

## Chạy unit test

Chạy trong thư mục `abc-frontend`, sau khi đã cài dependencies:

```powershell
# Chạy toàn bộ unit/component test: Vitest và các test Node cũ
npm test

# Chỉ chạy nhóm Vitest
npm run test:unit

# Chạy Vitest khi sửa code; nhấn Ctrl+C để dừng
npm run test:watch

# Chỉ chạy các test Node cũ về sales và purchases
npm run test:legacy

# Chỉ chạy nhóm test sales
npm run test:sales

# Kiểm tra TypeScript của source và test
npm run test:types
```

Test dùng jsdom và fixture/mock, không cần khởi động frontend, backend hoặc database thật. `npm run test:unit` chỉ chạy nhóm Vitest; dùng `npm test` để bao gồm cả các test Node hiện có.

Xem thêm [TESTING.md](TESTING.md).

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or Supabase publishable key). These are browser client settings; never put a Supabase service-role/secret key in this file.
3. Set `VITE_API_URL` to the backend API, normally `http://localhost:5000/api`.
4. Start the backend from `abc-backend` with `npm run dev`.
5. Start this app with `npm run dev`, then open `http://localhost:5173`.

In Supabase Auth URL Configuration, allow `http://localhost:5173/auth/callback`. Google and email sign-in, email verification, invitations and password reset all return through that URL.

Pages use the `src/pages/` groupings discussed for the MVP. Reusable Supabase/API calls live in `src/services/`, auth and permissions in `src/hooks/`, and shadcn-style primitives in `src/components/ui/`.

## F04 retail sales

- `/sales/new`: open the cashier's shift, search/filter inventory, inspect lots, select/create a customer and create a draft.
- `/sales`: filter and resume orders; cash totals on the summary cards cover only the displayed page.
- `/sales/:id`: confirm cash or bank transfer, cancel an unpaid draft, inspect payments/stock ledger and print a completed receipt.
- `/sales/customers`: search, paginate and create customers.

The workspace uses all nine `/sales` operations in `src/api/sales.ts`, plus inventory variant search and variant lot lookup. It requires `orders.read`, `orders.create` for writes and `inventory.read` for stock selection. Prices and sellable stock are checked by the backend; drafts do not reserve stock. Payment collects the exact order total once. Cash tender/change is a local calculator and is not stored. Bank transfers require manual verification; no bank webhook, discount or split payment is implied.

Run `npm run test:sales` for cash-change checks and `npm run build` for type checking and production bundling. Backend sales and Swagger tests are in `abc-backend/tests/sales.test.cjs` and `abc-backend/tests/fo4-swagger.test.cjs`.
