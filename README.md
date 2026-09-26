# Shadowing Studio

[English](README.en.md) · **Tiếng Việt**

Luyện shadowing tiếng Anh với video YouTube: dán link → luyện từng câu (lặp, nghỉ để nói, đổi tốc độ, ghi âm so sánh) → tra từ, ghi chú, lưu sổ tay. Giao diện tiếng Việt / tiếng Anh, sáng / tối.

React 19 · React Router · TanStack Query · MUI + Tailwind CSS · i18next · Vite. Deploy lên Vercel, không cần server hay database.

## Chạy local

```bash
pnpm install
pnpm dev      # http://localhost:5173 (kèm /api/video qua middleware của Vite)
pnpm test
pnpm build
```

## Deploy

Import repo vào Vercel (framework: Vite). `api/video.ts` tự thành serverless function; `vercel.json` rewrite mọi route còn lại về SPA.

## Bài học theo trình độ

`public/<level>-english-listening-practice/` chứa `download-report.json` của playlist và các file `.vtt` (phụ đề tự động YouTube, có thời gian từng từ). Trang `/lessons` đọc report, mở bài bằng file `.vtt` — không gọi YouTube hay server. Thêm trình độ mới: chép thư mục vào `public/` và thêm một dòng vào `LEVELS` trong `src/libs/constants.ts`.

## Biến môi trường

- `.env` (commit): URL công khai cho client, bắt buộc tiền tố `VITE_`, đọc bằng `import.meta.env.VITE_…` (kiểu khai báo ở `src/vite-env.d.ts`).
- `.env.local` (không commit, xem `.env.example`): bí mật phía server như `YT_PROXY_URL` — **không** dùng tiền tố `VITE_`, vì biến `VITE_*` bị nhúng vào code trình duyệt.

## Proxy cho YouTube (tuỳ chọn)

Trên Vercel, YouTube chặn IP máy chủ ("Sign in to confirm you're not a bot"). Không có proxy thì người dùng dán transcript / tải file phụ đề. Muốn lấy phụ đề tự động:

1. Chuẩn bị một HTTP proxy **dùng IP dân cư** (proxy datacenter/VPS cũng bị chặn y như Vercel). Tự dựng trên máy ở nhà hoặc dùng dịch vụ residential proxy đều được.
2. Vercel → Project → Settings → Environment Variables: `YT_PROXY_URL` = `http://user:pass@host:port`.
3. Redeploy. Mọi request tới YouTube của `api/video.ts` sẽ đi qua proxy; mỗi video ~175 KB, kết quả được CDN cache 1 ngày.

## Dữ liệu

- Lưu trong IndexedDB của trình duyệt (`src/lib/db.ts`): video + phụ đề + tiến độ, ghi chú, từ đã lưu, bản ghi âm.
- Xuất / nhập file JSON ở trang Thư viện để sao lưu hoặc chuyển máy (không gồm bản ghi âm).
- Cài đặt (ngôn ngữ, tốc độ, lặp…) ở localStorage; theme do MUI lưu (`mui-mode`).

## Dịch vụ bên ngoài

| Việc | Nguồn | Ghi chú |
|---|---|---|
| Tiêu đề + phụ đề | `api/video.ts` gọi YouTube (innertube, không chính thức) | Bị chặn trên Vercel nếu không có proxy; khi đó tiêu đề lấy qua oEmbed, phụ đề do người dùng dán transcript hoặc tải `.srt/.vtt` |
| Phát video | YouTube IFrame Player API | |
| Định nghĩa, IPA, audio | dictionaryapi.dev, dự phòng Wiktionary | Không có audio thì dùng giọng đọc của trình duyệt |
| Nghĩa tiếng Việt | MyMemory (dịch máy) | Giới hạn miễn phí ~5000 ký tự/ngày/IP; người dùng sửa được trước khi lưu |

## Agent Telegram (tuỳ chọn, chạy trên máy bạn)

Nhắn yêu cầu cho bot Telegram → `claude -p` làm theo skill `.claude/skills/ship-request` (verify → plan → code → review → fix → push) → mở PR vào `dev` → gửi link PR về Telegram. Agent không merge; bạn review và merge.

1. `brew install gh && gh auth login`
2. Tạo bot với @BotFather, ghi `TELEGRAM_BOT_TOKEN` vào `.env.local`.
3. `pnpm agent`, nhắn bất kỳ cho bot → bot trả `TELEGRAM_CHAT_ID=…` → ghi vào `.env.local`, chạy lại `pnpm agent`.
4. Bật branch protection cho `main` và `dev` trên GitHub (hook `agent/guard.sh` chỉ chặn theo mẫu lệnh).

Mỗi yêu cầu chạy trong git worktree riêng từ `origin/dev`, giới hạn `MAX_BUDGET_USD` (mặc định 5) và `MAX_TURNS` (80). Hook `agent/test-gate.sh` không cho agent kết thúc khi build/test đỏ.
