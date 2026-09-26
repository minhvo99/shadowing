---
name: ship-request
description: Đưa một yêu cầu tính năng/sửa lỗi của Shadowing Studio tới PR vào `dev` — verify yêu cầu → plan → code → review → fix → push → mở PR. Dùng khi agent Telegram giao việc, hoặc khi người dùng nói "làm rồi mở PR", "ship cái này".
---

# Yêu cầu → PR vào `dev`

## Ranh giới

- ĐƯỢC: đọc/sửa code, chạy `pnpm build` / `pnpm test`, tạo branch, commit, push branch của mình, `gh pr create`.
- KHÔNG: push lên `main` hay `dev`, force push, merge/đóng PR, đọc hay sửa `.env.local`, đổi cấu hình Vercel, thêm dependency khi vài dòng code làm được.

## 1. Verify yêu cầu

- Đọc yêu cầu, tìm code liên quan bằng Grep/Glob và đọc file thật, không đoán.
- Tự hỏi: rõ chưa? đã có sẵn chưa? làm được trong repo này không (React SPA trong `src/`, Vercel function trong `api/`, không có server riêng)?
- Đã có sẵn hoặc không nên làm → `rejected`, nói lý do. Thiếu thông tin mà không có mặc định hợp lý → `needs_clarification` với MỘT câu hỏi cụ thể. Hai trường hợp này không tạo branch, không mở PR.

## 2. Plan

- Viết plan ngắn: file sẽ sửa, cách làm, cách kiểm tra. Giữ lại để dán vào PR.
- Diff nhỏ nhất, đúng chỗ. Theo cấu trúc sẵn có: `src/components`, `pages`, `hooks`, `services` (TanStack Query), `libs`, `utils`, `configs`. UI dùng MUI + Tailwind. Chuỗi giao diện thêm vào cả `src/locales/vi.json` và `en.json`. Biến môi trường client đọc bằng `import.meta.env.VITE_*`.

## 3. Code

- `git switch -c feat/<slug-ngắn>` (sửa lỗi: `fix/<slug>`).
- Logic không tầm thường (parser, tính toán, rẽ nhánh) → thêm test vitest cạnh file (`*.test.ts`).
- `npx prettier --write <các file đã sửa>`.

## 4. Review

- Giao cho subagent (Agent tool, `general-purpose`) review `git diff origin/dev` với context sạch: bug, edge case, giao diện mobile ~375px, dark mode, thiếu key i18n, code thừa. Yêu cầu trả danh sách vấn đề kèm `file:line`.
- Tự đọc lại diff một lượt.

## 5. Fix

- Sửa các vấn đề thật mà review tìm ra. Góp ý thuần sở thích thì bỏ qua, ghi lý do vào PR.
- `pnpm build` (tsc + vite) và `pnpm test` phải xanh. Đỏ thì sửa tới khi xanh.

## 6. Push

- Commit: MỘT dòng subject tiếng Anh. Không body, không `Co-Authored-By`, không trailer nào.
- `git push -u origin HEAD`.

## 7. PR

`gh pr create --base dev --title "<subject>" --body-file <file>`. Body tiếng Việt, gồm:

- **Yêu cầu**: nguyên văn
- **Plan**
- **Thay đổi**: file nào, vì sao
- **Kiểm tra**: lệnh đã chạy và kết quả
- **Review**: vấn đề subagent tìm thấy, đã xử lý thế nào
- **Giả định / rủi ro**

Không thêm dòng "Generated with…".

## 8. Trả JSON

- `action`: `pr_opened` | `needs_clarification` | `rejected`.
- `summary`: 2–3 câu tiếng Việt, đọc trên điện thoại trong 10 giây.
- `pr_url`: có PR thì điền.
- `question`: điền khi `needs_clarification`.
