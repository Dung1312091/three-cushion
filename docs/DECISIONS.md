# Quyết định kỹ thuật (ADR)

Mỗi mục: bối cảnh → quyết định → hệ quả.

## ADR-001 — React + Vite thay cho Next.js
- **Bối cảnh:** Đặc tả §2 chọn Next.js App Router. Người dùng yêu cầu dùng React (không Next.js), ưu tiên mobile.
- **Quyết định:** SPA React 19 + Vite + react-router (data router). Lý thuyết dùng MDX biên dịch lúc build bằng `@mdx-js/rollup`; nội dung (frontmatter, glossary, bộ số, drill) được validate bằng Zod và xuất ra `src/generated/*.json` qua `scripts/build-content.ts`. Phòng tập và three.js được lazy-load.
- **Hệ quả:** Mất SSG/SEO của Next (có thể thêm prerender sau). Deploy là static (`dist/`), cần rewrite mọi route về `index.html`.

## ADR-002 — Phiên bản thư viện (cài ngày 24/10/2026)
react 19.3.1 · react-router 8.5.0 · vite 8.3.5 · tailwindcss 4.3.3 · three 0.186.1 · @react-three/fiber 9.8.2 · @react-three/drei 10.7.9 · zustand 5.0.16 · zod 4.6.7 · comlink 4.4.2 · minisearch 7.2.0 · idb-keyval 6.3.0 · vitest 5.0.5 · @playwright/test 1.64.1.
- **TypeScript 6.0.3** thay vì 7.0.2: TS 7 (bản native) chưa có JS API, typescript-eslint 8.72 yêu cầu `typescript < 6.1`.
- Node mặc định của máy là 18.0 (quá cũ cho Vite 8 / Tailwind 4) → chạy bằng Node 22.22 (nvm).

## ADR-003 — Sửa dấu ở hai công thức của đặc tả
- **§6.3 (trượt):** đặc tả ghi `ω(t) = ω0 − (5μs·g/2R)·t·(k̂ × û)`. Với `u = v + R(k̂ × ω)`, mômen ma sát cho `dω/dt = +(5μs·g/2R)(k̂ × û)`; dấu trừ làm độ trượt *tăng*. Cài theo dấu cộng — cho đúng `t_slide = 2|u0|/(7μs·g)` và tốc độ lăn `5/7·v0` như đặc tả kiểm tra (đã kiểm: dằn 3 m/s → trượt 0,437 s, 1,12 m).
- **§6.2 (squirt):** đặc tả ghi xoay v một góc `−sign(a)·α` nhưng đồng thời yêu cầu `a > 0` → bi lệch sang **trái**. Xoay `−α` (cùng chiều kim đồng hồ) đưa bi sang phải. Cài `+sign(a)·α` để đúng hành vi vật lý và đúng yêu cầu test.

## ADR-004 — Tìm nghiệm bậc 4 bằng tách khoảng thay cho Ferrari
- **Bối cảnh:** §6.4 đề xuất Ferrari + Newton, fallback chia khoảng.
- **Quyết định:** Dùng thẳng phương pháp tách khoảng theo điểm tới hạn (đệ quy đạo hàm) + bisection/Newton (`src/engine/quartic.ts`). Chỉ chấp nhận nghiệm cắt từ dương xuống (hai bi tiến lại gần).
- **Hệ quả:** Ổn định với nghiệm kép và hệ số đầu gần 0 (một bi đứng yên); hiệu năng đủ (xem bench).

## ADR-005 — Benchmark engine (Phase 0)
Đo trên MacBook (Node 22, `tsx`): `simulate` fast trung bình **0,096 ms/cú** (1.000 cú ngẫu nhiên, ~11,7 sự kiện/cú); một cú fine đầy đủ ~8 ms (lần chạy đầu, chưa JIT). Đạt mục tiêu §15 (≤ 0,5 ms) → không cần Rust/WASM. Trang `/dev/bench` đo lại trên trình duyệt và trong worker.

## ADR-006 — Solver: lưới preset thay cho lưới đầy đủ V0 × a × b
- **Bối cảnh:** Lưới §8.2 bước 2 (5 × 5 × 3 = 75 tổ hợp × quét φ quanh từng seed) quá lớn cho ngân sách 3 s.
- **Quyết định:** 24 preset (V0 ∈ {2.5, 3.5, 4.5, 5.5} × a ∈ {±0.3, 0} × b ∈ {±0.2}) × lưới φ (toàn vòng 0,5° + dày 0,1° trong góc nhìn hai bi mục tiêu, thay cho seed bi trước). Seed băng-trước nằm sẵn trong lưới toàn vòng. Bisection 2 mép cửa sổ tới 0,02°. Dung sai V0/a quét theo bậc {2, 5, 10, 20, 30}% thay cho bisection. Pool chia preset cho các worker; generator nhường event loop mỗi ~12 ms để hủy được.
- **Hệ quả:** Laptop: 8 phương án trong ~0,7 s với pool, ~2 s một luồng. Mọi phương án trả về đều được simulate lại bằng mô hình fine (không nhiễu) và chỉ giữ cú thực sự ghi điểm.

## ADR-007 — Bàn dọc trên điện thoại, bottom sheet tự viết, kính lúp SVG
- **Bàn dọc:** ở màn hình dọc, camera top-down xoay để chiều dài bàn nằm dọc → bi to gần gấp đôi so với bàn ngang full-width (§13.7 gợi ý ngang), dễ kéo bằng ngón tay hơn.
- **Bottom sheet:** tự viết (3 nấc, kéo tay cầm) thay cho shadcn Drawer/vaul — cần chế độ không modal để vẫn thao tác được trên canvas, và camera tự căn bàn vào vùng không bị sheet che.
- **Kính lúp:** vẽ bằng SVG theo tọa độ vật lý (phóng 2,5×, thước ¼ nút) thay cho render-to-texture — rẻ và nét trên mobile.
- **Bóng đổ:** bóng mờ (blob) dưới mỗi bi thay cho ContactShadows — rẻ hơn nhiều khi phát lại.

## ADR-008 — Thang lực
`level` = số chiều dài bàn mà bi được đánh giữa tâm đi được dọc bàn, **tính cả mất năng lượng ở băng**, làm tròn 1–10. Đặc tả nói "không va chạm", nhưng với μr = 0,008 cách đó cho mọi cú 3 băng đều ≥ 10/10, không còn ý nghĩa. [CẦN HLV DUYỆT]
