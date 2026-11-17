# Frontend tests

```powershell
npm test
npm run test:unit
npm run test:watch
npm run test:legacy
npm run test:types
```

`npm test` chạy cả Vitest và các test Node hiện có. `test:unit` chỉ chạy Vitest; `test:legacy` chạy các test sales/purchases cũ. `test:types` kiểm tra TypeScript của source, cấu hình Vitest và test mới.

Viết test Vitest trong `tests/unit/*.test.ts` hoặc `*.test.tsx`. Dùng React Testing Library để render, `user-event` để tương tác, và mock Supabase/fetch/API thay vì gọi backend thật. Cấu hình `vitest.config.ts` dùng alias `@` và jsdom; `tests/setup.ts` nạp DOM matcher, cleanup component và storage giữa các test.

Các test Node hiện có vẫn dùng loader TypeScript riêng. Khi chuyển chúng sang Vitest, giữ nguyên các tình huống nghiệp vụ rồi bỏ bản cũ sau khi đã chạy xác minh để tránh trùng test.
