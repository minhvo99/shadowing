# Shadowing Studio

Luyện shadowing tiếng Anh với video YouTube: dán link → luyện từng câu (lặp, nghỉ để nói, đổi tốc độ, ghi âm so sánh) → tra từ, ghi chú, lưu sổ tay. Giao diện tiếng Việt / tiếng Anh, sáng / tối.

React 19 · React Router · TanStack Query · MUI · Vite. Deploy lên Vercel, không cần server hay database.

## Chạy local

```bash
pnpm install
pnpm dev      # http://localhost:5173 (kèm /api/video qua middleware của Vite)
pnpm test
pnpm build
```

## Deploy

Import repo vào Vercel (framework: Vite). `api/video.ts` tự thành serverless function; `vercel.json` rewrite mọi route còn lại về SPA.

## Dữ liệu

- Lưu trong IndexedDB của trình duyệt (`src/lib/db.ts`): video + phụ đề + tiến độ, ghi chú, từ đã lưu, bản ghi âm.
- Xuất / nhập file JSON ở trang Thư viện để sao lưu hoặc chuyển máy (không gồm bản ghi âm).
- Cài đặt (ngôn ngữ, tốc độ, lặp…) ở localStorage; theme do MUI lưu (`mui-mode`).

## Dịch vụ bên ngoài

| Việc | Nguồn | Ghi chú |
|---|---|---|
| Tiêu đề + phụ đề | `api/video.ts` gọi YouTube (innertube, không chính thức) | YouTube có thể chặn IP máy chủ; khi đó dùng nút tải file `.srt/.vtt` |
| Phát video | YouTube IFrame Player API | |
| Định nghĩa, IPA, audio | dictionaryapi.dev, dự phòng Wiktionary | Không có audio thì dùng giọng đọc của trình duyệt |
| Nghĩa tiếng Việt | MyMemory (dịch máy) | Giới hạn miễn phí ~5000 ký tự/ngày/IP; người dùng sửa được trước khi lưu |
