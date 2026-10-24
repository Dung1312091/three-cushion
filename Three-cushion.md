# Three-cushion — Đặc tả kỹ thuật để build bằng Claude Code

> Ứng dụng web (responsive cho mobile) dạy và hướng dẫn **bida 3 băng (carom three-cushion)**.
> Gồm hai phần: **Lý thuyết** (thư viện kỹ thuật, bộ số, thuật ngữ có tìm kiếm và lọc) và **Phòng tập** (chọn bàn → đặt bi → app tính các đường ghi điểm → mô phỏng 3D chi tiết: cơ, điểm chạm, đường bi, đá bi, vị trí bi sau cú đánh).
>
> Tài liệu này là **nguồn sự thật duy nhất** (single source of truth) cho việc build. Phiên bản: 1.0 — 24/10/2026. Tác giả nội dung chuyên môn: DungLQ (VĐV/HLV). Cơ sở nghiên cứu: báo cáo "Ứng dụng hướng dẫn bida 3 băng" (Project Bida App).

---

## 0. Hướng dẫn dành cho Claude Code (đọc trước tiên)

1. **Đọc hết tài liệu này trước khi viết code.** Làm **tuần tự theo Phase** ở §14. Không nhảy sang phase sau khi tiêu chí "Done" của phase trước chưa đạt.
2. Đầu mỗi phase: tạo/cập nhật `docs/PROGRESS.md` (checklist của phase). Cuối phase: chạy `pnpm typecheck && pnpm lint && pnpm test`, cập nhật checklist, ghi các quyết định kỹ thuật vào `docs/DECISIONS.md` (ADR ngắn: bối cảnh → quyết định → hệ quả).
3. **Engine vật lý và solver là TypeScript thuần**, không import React/three/DOM. Bắt buộc bằng ESLint `no-restricted-imports` cho `src/engine/**` và `src/solver/**`.
4. **Đơn vị SI ở mọi nơi trong engine** (m, s, kg, rad). Chỉ đổi sang mm/nút/độ ở tầng hiển thị.
5. Mọi hằng số vật lý nằm trong `PhysicsParams` (không hard-code rải rác). Giá trị mặc định ở §6.6.
6. **Giấy phép:** được tham khảo và port thuật toán từ **pooltool** (Apache-2.0, ghi công trong `NOTICE.md`). **Không copy code** từ `tailuge/billiards` (GPL-3.0) — chỉ được đọc để đối chiếu hành vi.
7. Chỗ nào tài liệu đánh dấu **[CẦN HLV DUYỆT]** hoặc **[CHƯA KIỂM CHỨNG]**: vẫn implement với giá trị mặc định, nhưng phải để cấu hình được và liệt kê vào `docs/OPEN_QUESTIONS.md`.
8. Phiên bản thư viện: dùng **bản stable mới nhất tại thời điểm cài**, ghi lại phiên bản thực tế vào `docs/DECISIONS.md`. Không tự hạ phiên bản trừ khi có lỗi tương thích (ghi lý do).
9. Khi mơ hồ về **nghiệp vụ bida** → hỏi người dùng. Khi mơ hồ về **kỹ thuật** → chọn phương án đơn giản nhất thỏa tiêu chí, ghi ADR.
10. Ngôn ngữ UI: **tiếng Việt** (mọi chuỗi qua `src/i18n/vi.ts`, cấu trúc sẵn để thêm `en.ts` sau). Code, tên biến, commit message: tiếng Anh.

---

## 1. Mục tiêu sản phẩm

### 1.1 Người dùng
- Người chơi 3 băng nghiệp dư → khá ở Việt Nam, học viên của HLV.
- HLV dùng để minh họa bài giảng (chiếu màn hình/điện thoại cạnh bàn).
- Bối cảnh dùng chính: **điện thoại đặt cạnh bàn bida thật**, người dùng đặt lại thế bi đang gặp, xem hướng dẫn, rồi ra đánh thật.

### 1.2 Tính năng cốt lõi (MVP)
| # | Tính năng | Mô tả ngắn |
|---|---|---|
| F1 | Thư viện lý thuyết | Bài viết kỹ thuật, bộ số, thế bi; phân mục; tìm kiếm tiếng Việt có/không dấu; lọc theo facet |
| F2 | Máy tính bộ số | Nhập điểm đầu/điểm về → ra điểm ngắm (có sai số), vẽ sơ đồ |
| F3 | Chọn loại bàn | 5 preset kích thước + tham số bàn chỉnh được |
| F4 | Đặt bi | Kéo thả 3 bi trên bàn, kính lúp, tinh chỉnh ±1 mm, snap theo nút |
| F5 | Gợi ý cú đánh | Solver tìm nhiều phương án ghi điểm, hiển thị danh sách để chọn |
| F6 | Hướng dẫn chi tiết | Cơ 3D, điểm chạm trên bi cái, độ nghiêng cơ, hướng ngắm, lực, đường chạy của cả 3 bi, đá bi, vị trí bi dừng |
| F7 | Phát lại mô phỏng | Play/pause, tua, quay chậm, nhảy theo sự kiện (băng 1, băng 2, …), hai góc camera |
| F8 | Chế độ tự đánh | Người dùng tự chỉnh hướng/điểm chạm/lực, xem đường bi dự đoán realtime |
| F9 | Dải xác suất | Quạt đường đi + ellipse vị trí dừng theo nhiễu thực thi (chọn trình độ) |
| F10 | Hiệu chuẩn bàn | Wizard thử lăn + thử bộ 50 "50-30-20" → chỉnh tham số vật lý cho bàn của mình |

### 1.3 Không làm trong MVP (non-goals)
- App native iOS/Android (chỉ web responsive + PWA).
- Tài khoản/đăng nhập/backend (lưu cục bộ bằng IndexedDB).
- Nhận diện bi bằng camera, AR.
- Chơi đối kháng/game online.
- Tiếng Anh (chỉ chuẩn bị cấu trúc i18n).

### 1.4 Nguyên tắc "chân thực" (rất quan trọng)
Mô phỏng 3 băng **không bao giờ khớp tuyệt đối** bàn thật: hệ số ma sát/đàn hồi khác nhau theo bàn, nỉ, nhiệt độ; lệch 1° hướng ngắm ≈ 8,7 cm sau 5 m. Vì vậy:
- Luôn ghi "mô phỏng" — **không** gọi tỷ lệ là "xác suất thật".
- Luôn có **hiệu chuẩn theo bàn** và **dải xác suất**, không chỉ một đường.
- Kỳ vọng: sau hiệu chuẩn, băng 1–2 khớp tốt; từ băng 3 trở đi khớp định tính (vùng nút ± một phần nút).

---

## 2. Tech stack (đã chốt)

| Lớp | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | **Next.js (App Router)**, React 19, TypeScript `strict` | Lý thuyết SSG để SEO; Phòng tập client-only |
| Package manager | **pnpm** | Một app (không monorepo); engine/solver tách thư mục, cấm import UI |
| UI | **Tailwind CSS v4 + shadcn/ui**, lucide-react | Drawer/Sheet cho bottom sheet mobile |
| 3D | **three.js + @react-three/fiber (v9) + @react-three/drei** | Phòng tập |
| 2D sơ đồ | **SVG bằng React** + `d3-scale`, `d3-shape` (import từng module) | Sơ đồ lý thuyết, widget điểm chạm |
| State | **Zustand** | Store phòng tập |
| Validation | **Zod** | Schema nội dung, profile bàn, layout lưu |
| Worker | **Web Worker + Comlink** | Simulate + solver chạy ngoài main thread |
| Search | **MiniSearch** (index build sẵn lúc build) | `processTerm` = `viFold` (§11.4) |
| Nội dung | MDX trong repo (`content/`) + JSON (`content/systems/*.json`), đọc bằng `gray-matter` + `next-mdx-remote/rsc` | Validate bằng Zod lúc build |
| Lưu trữ cục bộ | IndexedDB qua `idb-keyval` | Layout đã lưu, profile bàn, kết quả hiệu chuẩn |
| Test | **Vitest** (+ `fast-check`), **Playwright** (smoke + visual) | Engine phải có golden tests |
| PWA | Phase 5: plugin PWA còn được bảo trì cho Next (ví dụ Serwist) — kiểm tra lúc làm | Offline cho phòng tập |
| Deploy | Static export nếu được (`output: 'export'`), hoặc Vercel | Không cần server |

Lý do không dùng engine vật lý tổng quát (Rapier/Cannon/Box2D/Ammo): time-step bỏ sót va chạm ở tốc độ cao, không có mô hình trượt→lăn, băng chỉ là hộp, không có throw và spin đúng. Dùng **engine event-based tự viết** (§6).

---

## 3. Cấu trúc thư mục

```
three-cushion/
├─ Three-cushion.md              ← tài liệu này
├─ NOTICE.md                     ← ghi công pooltool (Apache-2.0) và các nguồn công thức
├─ docs/
│  ├─ PROGRESS.md  DECISIONS.md  OPEN_QUESTIONS.md
├─ content/
│  ├─ articles/<category>/<slug>.mdx       ← bài lý thuyết
│  ├─ systems/<id>.json                    ← định nghĩa bộ số (SystemDefinition)
│  ├─ glossary.json                        ← thuật ngữ + alias
│  └─ drills/<id>.json                     ← bài tập/thế bi mẫu (DiagramSpec)
├─ scripts/
│  ├─ build-content.ts                     ← validate Zod + sinh search index JSON
│  └─ bench.ts                             ← benchmark engine trên Node
├─ public/textures/                        ← texture bi có chấm, nỉ
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx  page.tsx                          ← trang chủ
│  │  ├─ ly-thuyet/page.tsx                            ← danh mục + search + filter
│  │  ├─ ly-thuyet/[category]/[slug]/page.tsx          ← bài viết
│  │  ├─ bo-so/page.tsx  bo-so/[id]/page.tsx           ← danh sách & chi tiết bộ số + máy tính
│  │  ├─ thuat-ngu/page.tsx                            ← glossary
│  │  ├─ phong-tap/page.tsx                            ← client-only (dynamic import)
│  │  ├─ phong-tap/hieu-chuan/page.tsx                 ← wizard hiệu chuẩn
│  │  ├─ ban/page.tsx                                  ← quản lý profile bàn
│  │  └─ dev/bench/page.tsx                            ← benchmark trên trình duyệt (ẩn khỏi menu)
│  ├─ engine/                    ← TS thuần, KHÔNG import React/three/DOM
│  │  ├─ types.ts  params.ts  table.ts  vec.ts  quartic.ts
│  │  ├─ motion.ts               ← trạng thái & phương trình chuyển động
│  │  ├─ events.ts               ← tính thời điểm sự kiện
│  │  ├─ resolve/cue.ts  resolve/ballBall.ts  resolve/cushion/{mathavan.ts,impulse.ts,han.ts}
│  │  ├─ simulate.ts             ← vòng lặp event-based
│  │  ├─ rules.ts                ← luật ghi điểm 3 băng, phân loại kiss
│  │  ├─ bake.ts                 ← bake quaternion hướng bi cho phát lại
│  │  └─ __tests__/
│  ├─ solver/                    ← TS thuần
│  │  ├─ seeds.ts  sweep.ts  robustness.ts  leave.ts  classify.ts  instruct.ts  solve.ts
│  │  └─ __tests__/
│  ├─ systems/                   ← tính toán bộ số (dùng cho lý thuyết + giải thích solver)
│  │  ├─ numbering.ts  bo50.ts  plus.ts  cupNDN.ts  corrections.ts
│  ├─ workers/
│  │  ├─ sim.worker.ts           ← expose simulate/solve/bake qua Comlink
│  │  └─ pool.ts                 ← worker pool
│  ├─ features/
│  │  ├─ practice/               ← Scene3D, Table3D, Ball3D, Cue3D, Trails, Fans, Ghosts, Cameras,
│  │  │                            PlacementControls, Loupe, ShotList, InstructionPanel, TipWidget,
│  │  │                            PlaybackBar, ManualStrikePanel, store.ts
│  │  ├─ theory/                 ← DiagramSvg, SystemCalculator, Filters, SearchBox, ArticleCard
│  │  └─ calibration/            ← Wizard steps
│  ├─ content/                   ← schema Zod + loader (server)
│  ├─ lib/                       ← viFold, storage (idb), format (nút, độ, giờ), units
│  ├─ i18n/vi.ts
│  └─ components/ui/             ← shadcn
└─ e2e/                          ← Playwright
```

---

## 4. Hệ tọa độ & quy ước (BẮT BUỘC tuân thủ)

### 4.1 Hệ vật lý (engine)
- Gốc O tại **góc dưới-trái của mặt chơi**, đo tới **mũi băng** (cushion nose).
- Trục **x** dọc chiều dài L, trục **y** dọc chiều rộng W, trục **z** hướng lên. Mặt chơi: `0 ≤ x ≤ L`, `0 ≤ y ≤ W`.
- Tâm bi luôn có `z = R` (MVP không mô phỏng nhảy bi). Ràng buộc vị trí hợp lệ: `R ≤ x ≤ L−R`, `R ≤ y ≤ W−R`, khoảng cách tâm hai bi `≥ 2R`.
- Tên băng (cushion id):
  - `S1`: băng ngắn trái, x = 0 · `S2`: băng ngắn phải, x = L
  - `L1`: băng dài dưới, y = 0 · `L2`: băng dài trên, y = W
- Góc ngắm φ: góc của hướng đánh trong mặt phẳng xy, đo từ +x, ngược chiều kim đồng hồ, rad.
- Độ nghiêng cơ θ: góc giữa cơ và mặt bàn (0 = nằm ngang), rad. Đuôi cơ cao hơn đầu cơ.
- Điểm chạm trên bi cái `(a, b)` theo **đơn vị R**, nhìn từ phía người đánh: `a > 0` = bên phải tâm, `b > 0` = phía trên tâm. Ràng buộc `a² + b² ≤ MISCUE_LIMIT²` (mặc định 0,5).
- Spin: `ω_y > 0` khi bi đi +x nghĩa là **xoáy thượng (cule)**; quy ước đầy đủ suy ra từ công thức §6.2 — viết unit test xác nhận: đánh `b>0` ra topspin, `b<0` ra backspin, `a>0` bi cái lệch (squirt) sang trái và xoáy ngang đúng chiều "áp phê phải".

### 4.2 Nút (diamond)
- Bàn carom luôn tỉ lệ 2:1 → khoảng cách nút `D = L/8 = W/4`.
- Nút trên băng dài: `x = i·D`, i = 0…8 (i = 0 và 8 là góc). Nút trên băng ngắn: `y = j·D`, j = 0…4.
- Nút vật lý nằm trên **mặt khung (rail top)**, lùi sau mũi băng một khoảng `diamondOffset` (mặc định **0,078 m**, chỉnh theo bàn [CHƯA KIỂM CHỨNG theo hãng]). "Ngắm xuyên nút" = đường ngắm đi qua điểm nút trên khung; "ngắm trước mặt nút" = đường ngắm đi qua hình chiếu của nút trên mũi băng.
- Đơn vị hiển thị vị trí: "nút" (số thực, ví dụ 2,5 nút). Bộ số có thang riêng (§10).

### 4.3 Hệ hiển thị (three.js)
- **Không đổi tọa độ thủ công.** Bọc toàn bộ bàn trong `<group rotation-x={-Math.PI / 2} position={[-L/2, 0, W/2]}>` (kiểm tra dấu bằng test trực quan: x vật lý sang phải màn hình, y vật lý lên trên màn hình ở camera top-down). Mọi object con (bi, vết, cơ) dùng **trực tiếp tọa độ vật lý** và **quaternion vật lý**.

---

## 5. Bàn & thiết bị

### 5.1 Preset kích thước (mặt chơi, đo giữa hai mũi băng)

| id | L × W (mm) | Tên gọi (alias hiển thị) | Băng (mm) | Bi (mm / g) |
|---|---|---|---|---|
| `UMB_MATCH` (mặc định) | 2840 × 1420 | Bàn 3 băng, bàn carom thi đấu, 국제식 대대 | 37 | 61,5 / 210 |
| `MID_2540` | 2540 × 1270 | Bàn phăng/líp, bàn trung (alias), 국제식 중대 | 37 [CHƯA KIỂM CHỨNG cho VN] | 61,5 / 210 |
| `KR_DOMESTIC_MID` | 2448 × 1224 | Bàn Hàn nội địa (4 bi), 국내식 중대 | 40 | 65,5 / 250 [ngoại suy] |
| `HALF_MATCH` | 2300 × 1150 | Half-match | 37 | 61,5 / 210 |
| `SMALL` | 2100 × 1050 | Bàn nhỏ | 37 | 61,5 / 210 |

Nguồn chính: UMB World Rules (2,84 × 1,42 m ±5 mm; băng 37 ±1 mm; bi 61–61,5 mm, 205–220 g), DBU, các nguồn Hàn. App chỉ cho chọn **kích thước lòng bàn**; tên địa phương chỉ là alias. Người dùng có thể nhập kích thước tùy chỉnh (giữ tỉ lệ 2:1 là khuyến nghị, không bắt buộc).

### 5.2 TableProfile

```ts
// src/engine/table.ts
export type TablePreset = 'UMB_MATCH' | 'MID_2540' | 'KR_DOMESTIC_MID' | 'HALF_MATCH' | 'SMALL' | 'CUSTOM';
export type ClothState = 'new_fast' | 'normal' | 'worn';

export interface TableProfile {
  id: string;                  // uuid; preset gốc có id cố định
  name: string;                // "Bàn số 3 CLB X"
  preset: TablePreset;
  L: number; W: number;        // m
  cushionHeight: number;       // m (mũi băng so với mặt bàn), 0.037
  ballRadius: number;          // m, 0.03075
  ballMass: number;            // kg, 0.210
  diamondOffset: number;       // m, 0.078
  heated: boolean;
  cloth: ClothState;
  physics: PhysicsParams;      // §6.6 — preset theo cloth/heated, ghi đè bởi hiệu chuẩn
  calibration?: TableCalibration; // §12
}
```

Preset vật lý theo trạng thái (gợi ý ban đầu, sẽ được hiệu chuẩn): `new_fast`+heated → μs 0,15, μr 0,006; `normal` → μs 0,2, μr 0,008; `worn` hoặc không sưởi → μs 0,22, μr 0,011, e_c giảm 0,03 (bàn lạnh chạy "ngắn" ½–1 nút).

### 5.3 Bi
- 3 bi: `white` (trắng), `yellow` (vàng), `red` (đỏ). Người dùng chọn **bi cái** là trắng hoặc vàng (mặc định trắng); hai bi còn lại là bi mục tiêu.
- Vị trí khai cuộc mẫu (USBA, bàn 2840): đỏ ở foot spot (x = 3L/4, y = W/2), bi đối thủ ở head spot (x = L/4, y = W/2), bi cái trên head string cách head spot 0,1825 m. Với bàn khác: scale theo L (DBU: 0,148 m @2,30 m; 0,135 m @2,10 m). Dùng làm nút "Xếp khai cuộc".

---

## 6. Engine vật lý event-based

### 6.1 Tổng quan
Giữa hai sự kiện, mỗi bi ở một trong 4 trạng thái chuyển động có nghiệm giải tích (vị trí là đa thức bậc ≤ 2 theo t). Vòng lặp: tính thời điểm sự kiện sớm nhất → tiến mọi bi đến thời điểm đó bằng công thức đóng → giải quyết sự kiện → lặp lại cho tới khi mọi bi dừng.

Ký hiệu: m khối lượng, R bán kính, `I = (2/5) m R²`, g = 9,81 m/s², `k̂ = (0,0,1)`.
Vận tốc trượt tại điểm tiếp xúc nỉ: **`u = v + R·(k̂ × ω)`** (chú ý dấu: với điểm tiếp xúc ở `−R k̂`, vận tốc điểm đó là `v + ω × (−R k̂) = v + R k̂ × ω`).

```ts
// src/engine/types.ts
export type Vec3 = [number, number, number];
export type BallId = 'white' | 'yellow' | 'red';
export type MotionState = 'stationary' | 'spinning' | 'rolling' | 'sliding';
export type CushionId = 'S1' | 'S2' | 'L1' | 'L2';

export interface BallState {
  id: BallId;
  r: Vec3;        // vị trí tâm (z = R)
  v: Vec3;        // vận tốc tịnh tiến (v_z = 0)
  w: Vec3;        // vận tốc góc
  s: MotionState;
}

export interface CueStrike {
  phi: number;    // rad
  theta: number;  // rad, độ nghiêng cơ (0..~1.3)
  a: number;      // offset ngang, đơn vị R (+ = phải)
  b: number;      // offset dọc, đơn vị R (+ = trên)
  V0: number;     // m/s, tốc độ đầu cơ
}

export type SimEvent =
  | { t: number; type: 'strike'; ball: BallId }
  | { t: number; type: 'ball-ball'; a: BallId; b: BallId; pos: [number, number]; relSpeed: number }
  | { t: number; type: 'ball-cushion'; ball: BallId; cushion: CushionId; pos: [number, number]; speedIn: number }
  | { t: number; type: 'transition'; ball: BallId; from: MotionState; to: MotionState };

/** Một đoạn chuyển động giải tích giữa hai sự kiện của MỘT bi */
export interface Segment {
  ball: BallId; t0: number; t1: number; state: MotionState;
  r0: Vec3; v0: Vec3; w0: Vec3;          // trạng thái đầu đoạn
  // gia tốc hằng trong đoạn (đủ để eval r(t), v(t), w(t))
  acc: Vec3; wAcc: Vec3;
}

export interface ShotResult {
  events: SimEvent[];
  segments: Segment[];          // sắp theo ball rồi t0
  final: BallState[];
  tEnd: number;
  rules: RuleOutcome;           // §7
  truncated: boolean;           // vượt MAX_EVENTS / MAX_TIME
}
```

### 6.2 Cơ chạm bi (cue strike) — mô hình xung lực tức thời (Alciatore TP A.30, dạng vector 3D)

Dạng vector, không phụ thuộc quy ước khung cục bộ:
```
ĉ  = (cosθ·cosφ, cosθ·sinφ, −sinθ)          // hướng cơ (chúc xuống khi θ>0)
r̂  = normalize(ĉ × k̂)                        // phải (theo góc nhìn người đánh)
û  = r̂ × ĉ                                   // "lên" vuông góc với ĉ
rQ = R·(a·r̂ + b·û) − R·√(1 − a² − b²)·ĉ      // điểm chạm trên mặt bi, tính từ tâm
n2 = |rQ × ĉ|²                                // = R²(a² + b²)
J  = (1 + e_tip)·M·V0 / (1 + M/m + M·n2/I)    // M: khối lượng cơ (~0,5 kg), e_tip ≈ 1 (dùng 1 → khớp TP A.30)
v  = (J/m)·ĉ            ;  ω = (rQ × J·ĉ)/I
v_z := 0                                     // MVP: mặt bàn hấp thụ thành phần chúc xuống, không nhảy bi
```
Kiểm tra trường hợp cơ nằm ngang (θ=0): công thức phải trùng `v_b = 2V0/(1 + m/M + (5/2)(a²+b²))`.

**Squirt** (bi cái lệch hướng khi đánh áp phê, TP A.31), xoay vector v trong mặt phẳng xy một góc `−sign(a)·α`:
```
α = atan( (5/2)·|a|·√(1−a²) / (1 + m/m_e + (5/2)(1−a²)) )      // m_e: endmass ngọn cơ
```
Mặc định `m/m_e = 25` [CHƯA KIỂM CHỨNG cho cơ carom], cấu hình được trong PhysicsParams (`squirtMassRatio`).

**Giới hạn trượt cơ:** nếu `a² + b² > MISCUE_LIMIT²` (0,5²) → không cho phép (UI chặn, solver không sinh). Trạng thái sau cú đánh: `sliding` (trừ khi u = 0 chính xác).

### 6.3 Chuyển động trên nỉ (Kiefl/pooltool, Han motion)

Tham số: `μs` (trượt), `μr` (lăn), `αsp` (giảm tốc xoay quanh trục z, rad/s²).

**SLIDING** (u ≠ 0). Đặt `û0 = u0/|u0|` (chỉ thành phần xy):
```
r(t)   = r0 + v0·t − ½·μs·g·t²·û0
v(t)   = v0 − μs·g·t·û0
ω_xy(t)= ω0,xy − (5·μs·g/(2R))·t·(k̂ × û0)
ω_z(t) = ω0,z − sign(ω0,z)·αsp·t          (kẹp về 0)
t_slide→roll = 2|u0| / (7·μs·g)
```
**ROLLING** (u = 0):
```
r(t) = r0 + v0·t − ½·μr·g·t²·v̂0 ;  v(t) = v0 − μr·g·t·v̂0
ω_xy luôn thỏa lăn không trượt: ω_xy = (1/R)·(k̂ × v)  ⇔  v = −R·(k̂ × ω)... (dùng một dạng, test chéo)
ω_z(t) như trên
t_roll→stop = |v0| / (μr·g)   → sang SPINNING nếu ω_z ≠ 0, ngược lại STATIONARY
```
**SPINNING** (v = 0, ω_z ≠ 0): `ω_z(t) = ω0,z − sign·αsp·t`, `t_stop = |ω0,z|/αsp`.
**STATIONARY**: không làm gì.

Lưu ý: khi một bi đang SLIDING bị va chạm, tính lại u và trạng thái ngay sau va chạm. Sau va chạm bi–bi, bi cái còn spin thượng/trô nên trượt theo **parabol** — đây chính là đường "cule/trô" sau khi chạm bi. Massé cũng là parabol trong pha trượt (TP A.19) — mô hình 3D ở §6.2 tự sinh ra vì ω có thành phần không nằm ngang.

### 6.4 Tính thời điểm sự kiện (events.ts, quartic.ts)

- **Chuyển trạng thái:** công thức đóng ở §6.3.
- **Bi–băng thẳng** (4 đường mũi băng): bi chạm băng S1 khi `x(t) = R`, S2 khi `x(t) = L − R`, L1 khi `y(t) = R`, L2 khi `y(t) = W − R`. Mỗi cái là phương trình bậc 2 theo t; chỉ nhận nghiệm khi bi đang **đi vào** băng (thành phần vận tốc pháp tuyến hướng vào băng).
- **Bi–bi:** với `r_i(t) = A_i t² + B_i t + C_i`, đặt `A = A_i − A_j`, `B = B_i − B_j`, `C = C_i − C_j`:
  ```
  (A·A)t⁴ + 2(A·B)t³ + (B·B + 2A·C)t² + 2(B·C)t + (C·C − 4R²) = 0
  ```
  Lấy **nghiệm thực dương nhỏ nhất** với điều kiện hai bi đang **tiến lại gần** (`(r_i − r_j)·(v_i − v_j) < 0` tại thời điểm đó). Coi nghiệm là thực nếu `|Im| < 1e-9`.
- `quartic.ts`: giải bậc 4 bằng công thức đóng (Ferrari) **+ 2–3 bước Newton để làm mịn**; fallback: chia khoảng [0, t_max] (t_max = thời điểm sự kiện khác sớm nhất) và tìm đổi dấu/bisection. Có test với nghiệm kép, hệ số gần 0 (một bi đứng yên → suy biến bậc thấp hơn).
- Chống lặp vô hạn: bỏ qua sự kiện cùng cặp/cùng băng trong `T_EPS = 1e-9 s` sau khi vừa xử lý; `MAX_EVENTS = 400`, `MAX_TIME = 60 s` → `truncated = true`.

### 6.5 Giải quyết va chạm

#### 6.5.1 Bi–bi (frictional inelastic, Alciatore TP A.14 / pooltool)
Khung va chạm: `n̂ = (r_j − r_i)/|r_j − r_i|` (trong mặt phẳng xy).
- Pháp tuyến (COR e_b):
  ```
  v_in = v_i·n̂ ; v_jn = v_j·n̂
  v_in' = ½[(1−e_b)v_in + (1+e_b)v_jn] ;  v_jn' = ½[(1+e_b)v_in + (1−e_b)v_jn]
  ```
- Ma sát tiếp tuyến tại điểm tiếp xúc (gây **throw** và truyền spin):
  ```
  vận tốc trượt tại điểm tiếp xúc: s = (v_i + ω_i × (R n̂)) − (v_j + ω_j × (−R n̂)), bỏ thành phần theo n̂
  μ_b(v_rel) = 0.009951 + 0.108·exp(−1.088·v_rel)     (v_rel: |s| tại thời điểm va chạm, m/s)
  Δp_n = m·|v_in' − v_in|            (độ lớn xung pháp tuyến)
  Trượt (μ_b·Δp_n đủ nhỏ):   Δp_t = −μ_b·Δp_n·ŝ
  Không trượt (đạt giới hạn): Δp_t sao cho thành phần trượt tiếp tuyến về 0, tức |Δp_t| = m·|s|/7 (hai bi cùng khối lượng) → dùng min(μ_b·Δp_n, m|s|/7)
  v_i += Δp_t/m ; v_j −= Δp_t/m
  ω_i += (R n̂ × Δp_t)/I ; ω_j += ((−R n̂) × (−Δp_t))/I
  ```
  Implement theo `pooltool/physics/resolve/ball_ball/frictional_inelastic` (port có ghi công). Chỉ giữ thành phần xy của v.
- Mặc định `e_b = 0.95`.
- Test bắt buộc: **quy tắc 90°** (bi cái dằn, va nửa bi → hai bi tách ~90°) và **quy tắc 30°** (bi cái lăn, va từ ¼ đến ¾ bi → bi cái lệch ~27°–34° so với hướng ban đầu sau khi về lăn). Throw cực đại ~5°.

#### 6.5.2 Bi–băng — mô hình mặc định: **Mathavan 2010** (pooltool `mathavan_2010`)
Khung cục bộ của băng: trục **y' hướng vào băng**, x' dọc theo băng, z lên. Xoay v, ω sang khung này, giải, rồi xoay ngược.
Góc tiếp xúc: `sinθc = (h − R)/R` với `h = cushionHeight` (bàn carom: h = 37 mm, R = 30,75 mm → sinθc ≈ 0,203). Cho phép ghi đè bằng `cushionContactSin` trong PhysicsParams (Mathavan gốc dùng 0,4) [CẦN HIỆU CHUẨN].

Vận tốc trượt:
```
Tại băng I:  ẋ_I = v_x + ω_y·R·sinθc − ω_z·R·cosθc ;  ẏ_I = −v_y·sinθc + ω_x·R
Tại nỉ  C:  ẋ_C = v_x − ω_y·R ;                     ẏ_C = v_y + ω_x·R
φ = atan2(ẏ_I, ẋ_I) ;  φ' = atan2(ẏ_C, ẋ_C)
```
Tích phân theo xung pháp tuyến P với bước ΔP:
```
k = μs·(sinθc + μw·sinφ·cosθc)
Δv_x = −(1/m)[μw·cosφ + k·cosφ'] ΔP
Δv_y = −(1/m)[cosθc − μw·sinθc·sinφ + k·sinφ'] ΔP
Δω_x = −(5/(2mR))[μw·sinφ + k·sinφ'] ΔP
Δω_y = −(5/(2mR))[μw·cosφ·sinθc − k·cosφ'] ΔP
Δω_z = +(5/(2mR))[μw·cosφ·cosθc] ΔP
ΔW   = ΔP·|v_y|·cosθc
```
- Pha nén: lặp tới khi `v_y ≤ 0` (hết đi vào băng), cộng dồn `W_c`. Pha hồi: lặp tới khi công hồi `W_r ≥ e_c²·W_c`.
- Bước: `ΔP = max(m·v_y0/N, 1e-4)`. **Hai chế độ:** `N = 5000` (chính xác — dùng cho phát lại và kiểm chứng) và `N = 200` (nhanh — dùng trong solver). Có test so sánh hai chế độ: sai lệch góc bật < 0,3° trên lưới góc tới/spin chuẩn; nếu vượt, tăng N nhanh.
- Tính cos/sin của φ, φ' bằng chuẩn hóa vector (tránh atan2 + cos/sin).
- Hệ số phục hồi phụ thuộc tốc độ (tùy chọn, mặc định tắt, bật qua `cushionRestitutionModel: 'constant' | 'speedPoly'`):
  `e_c(v⊥) = max(0.40, 0.50 + 0.257·v⊥ − 0.044·v⊥²)` (pooltool, đang tắt ở upstream) — dùng khi hiệu chuẩn cho thấy sai số theo lực.
- Sau va chạm: đặt `v_z = 0`, trạng thái = sliding (hoặc rolling nếu |u| < 1e-9).

**Mô hình thay thế** (chọn trong PhysicsParams `cushionModel`):
- `impulse`: phản xạ pháp tuyến với e_c + ma sát Coulomb tiếp tuyến tại băng (rất nhanh, dùng để debug và làm baseline).
- `han2005`: closed-form (Kiefl đã sửa lỗi). **Trước khi implement phải đối chiếu phương trình ω' với trang gốc** https://ekiefl.github.io/2020/04/24/pooltool-theory/ (bản ghi chú nghiên cứu bị lỗi hiển thị). Phase 4 mới làm, chỉ để so sánh.

### 6.6 PhysicsParams mặc định

```ts
// src/engine/params.ts
export interface PhysicsParams {
  g: number;                 // 9.81
  muSlide: number;           // μs bi–nỉ, 0.2  (khoảng 0.126–0.4)  [CẦN HIỆU CHUẨN]
  muRoll: number;            // μr, 0.008 (0.005–0.016)            [CẦN HIỆU CHUẨN]
  spinDecel: number;         // αsp rad/s², 10 (5–15)
  eBall: number;             // 0.95
  ballFriction: 'alciatore'; // μ_b(v) như §6.5.1
  cushionModel: 'mathavan' | 'impulse' | 'han2005';
  eCushion: number;          // 0.80 (0.6–0.9; đo cộng đồng 0.73 lạnh / 0.77 ấm)  [CẦN HIỆU CHUẨN]
  muCushion: number;         // μw 0.15 (0.14–0.175)                                [CẦN HIỆU CHUẨN]
  cushionContactSin?: number;// ghi đè sinθc; mặc định tính từ cushionHeight
  cushionRestitutionModel: 'constant' | 'speedPoly';
  mathavanStepsFine: number; // 5000
  mathavanStepsFast: number; // 200
  cueMass: number;           // 0.5 kg
  tipRestitution: number;    // 1.0
  squirtMassRatio: number;   // m/m_e = 25                                         [CHƯA KIỂM CHỨNG]
  miscueLimit: number;       // 0.5 (đơn vị R)
}
```

### 6.7 API engine

```ts
// src/engine/simulate.ts
export interface SimOptions {
  fast?: boolean;                 // Mathavan bước thô
  earlyExit?: (e: SimEvent, ctx: RuleContext) => 'continue' | 'stop'; // solver dừng sớm khi kết cục rõ
  recordSegments?: boolean;       // false trong solver để nhanh
}
export function simulate(
  table: TableProfile, balls: BallState[], cue: BallId, strike: CueStrike, opts?: SimOptions,
): ShotResult;

export function evalBall(seg: Segment, t: number): { r: Vec3; v: Vec3; w: Vec3 }; // giải tích
export function sampleTrack(result: ShotResult, ball: BallId, hz: number): Float32Array; // [x,y]*N
```

Yêu cầu hiệu năng (đo ở Phase 0, §13): vòng lặp nóng **không cấp phát** (dùng Float64Array/tuple tái sử dụng), không dùng closure trong vòng lặp nóng, không dùng `Math.pow`.

### 6.8 Bake hướng bi để phát lại (bake.ts)

Vị trí: main thread tự tính giải tích từ `segments` (rẻ). Hướng bi (quaternion) cần tích phân ω → worker bake sẵn ở **120 Hz**:
```ts
export interface BakedShot {
  hz: number;                          // 120
  tEnd: number;
  quats: Record<BallId, Float32Array>; // [qx,qy,qz,qw] × N  (transferable)
}
// mỗi bước: q ← normalize( dq(ω·dt) ⊗ q ),  dq = [ω̂·sin(|ω|dt/2), cos(|ω|dt/2)]  (khung thế giới → nhân trái)
```
Một cú 10 s × 3 bi × 120 Hz × 4 float ≈ 58 KB. Transfer bằng `Comlink.transfer`.

---

## 7. Luật 3 băng & phân loại (rules.ts)

**Ghi điểm (carom 3 băng):** bi cái chạm **cả hai** bi mục tiêu, và **trước khi** chạm bi mục tiêu thứ hai, bi cái đã chạm băng **ít nhất 3 lần** (các lần chạm băng có thể trước hoặc sau khi chạm bi mục tiêu thứ nhất; chạm cùng một băng nhiều lần vẫn tính).

```ts
export interface RuleOutcome {
  scored: boolean;
  firstObject?: BallId;
  secondObject?: BallId;
  cushionsBeforeSecond: number;
  cueCushionSeq: CushionId[];          // các băng bi cái chạm trước khi chạm bi mục tiêu thứ 2
  firstContact: 'ball' | 'rail';
  kisses: KissInfo[];
}
export interface KissInfo {
  t: number; pair: [BallId, BallId];
  kind: 'object-object' | 'cue-object-repeat';   // va chạm ngoài các va chạm "chủ đích"
  effect: 'kiss-out' | 'lucky' | 'neutral';       // làm hỏng / vẫn ghi điểm nhờ kiss / không ảnh hưởng
}
```
- **Va chạm chủ đích:** lần đầu bi cái chạm bi mục tiêu thứ nhất, lần đầu bi cái chạm bi mục tiêu thứ hai. Mọi va chạm bi–bi khác là **kiss (đá bi)**.
- Phân loại `effect`: chạy lại mô phỏng với va chạm kiss bị "tắt" (cho hai bi đi xuyên nhau tại sự kiện đó) — nếu kết quả ghi điểm khác đi thì `kiss-out` (khi mất điểm) hoặc `lucky` (khi nhờ kiss mới ăn); nếu không khác thì `neutral`. Chỉ chạy bước này cho các phương án cuối (tốn thêm 1 simulate/kiss).
- **Mã họ thế bi** (`classify.ts`): 
  - `firstContact`: ball (bi trước) / rail (băng trước, "a băng").
  - `railCode`: 3 băng đầu của bi cái, ký hiệu S (ngắn) / L (dài), ví dụ `LSL` (thế sườn), `SLS` (cúp N-D-N), `LLS`, …
  - `english`: running/reverse tại băng 1 — running nếu `ω_z · ((n̂ × v_in)·k̂) < 0`, với n̂ là pháp tuyến hướng vào băng (viết test xác nhận bằng một cú áp phê thuận rõ ràng).
  - Alias tiếng Việt theo railCode + firstContact: `rail+LSL` → "Thế sườn (bộ 50)", `rail+SLS` → "Cúp N-D-N", `ball+…` → "Bi trước …", v.v. Bảng ánh xạ để trong `content/glossary.json`, **[CẦN HLV DUYỆT]**.

---

## 8. Solver — tìm & xếp hạng cú đánh

### 8.1 Đầu vào / đầu ra
```ts
// src/solver/solve.ts
export interface SolveRequest {
  table: TableProfile;
  balls: BallState[];          // 3 bi đứng yên
  cue: BallId;
  skill: SkillLevel;           // quyết định nhiễu Monte Carlo
  maxOptions: number;          // 8
  budgetMs: number;            // 3000
}
export type SkillLevel = 'pro' | 'advanced' | 'intermediate' | 'beginner';
export const SKILL_NOISE: Record<SkillLevel, { phiDeg: number; speedPct: number; tipR: number; thetaDeg: number }> = {
  pro:          { phiDeg: 0.125, speedPct: 2,  tipR: 0.016, thetaDeg: 0.1 }, // ~ mô hình ICGA 2008
  advanced:     { phiDeg: 0.25,  speedPct: 5,  tipR: 0.03,  thetaDeg: 0.5 },
  intermediate: { phiDeg: 0.4,   speedPct: 8,  tipR: 0.06,  thetaDeg: 1 },
  beginner:     { phiDeg: 0.6,   speedPct: 12, tipR: 0.1,   thetaDeg: 2 },
}; // [CHƯA KIỂM CHỨNG — chưa có dữ liệu đo người chơi nghiệp dư]

export interface ShotOption {
  id: string;
  strike: CueStrike;
  firstObject: BallId;
  family: { firstContact: 'ball' | 'rail'; railCode: string; english: 'running' | 'reverse' | 'none'; labelVi: string };
  system?: SystemMatch;            // §10.5: "Bộ 50 dự đoán 20 — mô phỏng 22"
  pScore: number;                  // Monte Carlo
  pScoreCI: [number, number];      // khoảng Wilson 95%
  kissRisk: number;                // tỷ lệ mẫu có kiss-out
  tolerance: { phiDeg: [number, number]; speedPct: [number, number]; sideTips: [number, number] };
  difficulty: 1 | 2 | 3 | 4 | 5;
  leaveScore: number;              // 0..1
  finalPositions: Record<BallId, { x: number; y: number; ellipse: { rx: number; ry: number; rot: number } }>;
  instruction: HumanInstruction;   // §9
}
export type SolveProgress = { kind: 'option'; option: ShotOption } | { kind: 'done'; stats: SolveStats };
```
Solver **stream** kết quả: gửi phương án đầu tiên ngay khi có (mục tiêu ≤ 1 s trên điện thoại tầm trung), sau đó bổ sung/cập nhật.

### 8.2 Pipeline

```text
0. Cache: chuẩn hóa layout (làm tròn 5 mm) + 4 phép đối xứng (lật x, lật y, xoay 180°) → tra cache LRU.
1. SEED — cho cả 2 lựa chọn bi mục tiêu thứ nhất:
   a. Bi trước: lưới độ dày f ∈ {1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8} × 2 phía (trái/phải) → φ tới ghost ball.
   b. Băng trước: với mỗi railCode phổ biến (LSL, SLS, LLS, SLL, LSS…) và điểm ngắm băng 1 theo lưới ¼ nút
      → φ; ưu tiên seed từ bộ 50 / Plus / cúp N-D-N (§10) khi thế bi khớp phạm vi.
   c. Phản xạ gương (unfold) tối đa 4 băng tới ảnh của bi mục tiêu thứ 2 → φ (chỉ là seed).
2. QUÉT THÔ: V0 ∈ {1.5, 2.5, 3.5, 4.5, 6} m/s × a ∈ {−0.4, −0.2, 0, 0.2, 0.4} × b ∈ {−0.3, 0, 0.3}
   × φ quanh mỗi seed ±3° bước 0.5°; θ = 5° (mặc định, cơ hơi nâng); simulate(fast, earlyExit).
   earlyExit: dừng khi đã ghi điểm; khi bi cái chạm bi mục tiêu thứ 2 mà chưa đủ 3 băng; khi bi cái dừng.
3. CỬA SỔ φ: gom các φ liên tiếp ghi điểm thành cửa sổ; bisection 2 mép (tới 0.02°) → φ* = tâm, wφ = độ rộng.
4. DUNG SAI: bisection cửa sổ cho V0 và a quanh nghiệm (≈ 30–40 sim/ứng viên).
5. ƯỚC LƯỢNG NHANH: P ≈ Pφ·PV·Pa, với Pφ = Φ((φhi−φ*)/σφ) − Φ((φlo−φ*)/σφ) (σ theo SkillLevel).
6. MONTE CARLO cho top 10: 64 mẫu nhiễu Gauss (common random numbers giữa các ứng viên, seed cố định)
   → pScore, kissRisk, phân bố vị trí dừng (trung bình + ma trận hiệp phương sai → ellipse 1σ).
7. LEAVE (thế bi để lại) — heuristic 0..1 [CẦN HLV DUYỆT trọng số]:
   + hai bi mục tiêu gần nhau (< 0.5 m), + bi không dính băng (> 2R + 1 cm), + không có bi nào bị che,
   − bi cái dính bi/băng, − ba bi thẳng hàng dọc băng.
8. PHÂN LOẠI + CHỈ DẪN (§7, §9) + SystemMatch (§10.5).
9. XẾP HẠNG + ĐA DẠNG: score = 0.6·pScore + 0.2·leaveScore − 0.15·kissRisk − 0.05·(difficulty/5);
   giữ tối đa 2 phương án mỗi (firstObject, railCode); trả tối đa maxOptions.
   difficulty từ pScore (beginner noise): ≥0.6→1, ≥0.4→2, ≥0.25→3, ≥0.1→4, còn lại 5.
```

### 8.3 Song song & ngân sách
- Worker pool: `min(navigator.hardwareConcurrency − 1, 4)` worker, mỗi worker nhận một lô seed. Main thread gộp kết quả.
- Ngân sách mặc định 3 s; hết ngân sách thì trả những gì đã có, đánh dấu `partial`.
- Khi người dùng kéo bi → **hủy** lần giải đang chạy (AbortSignal qua Comlink proxy hoặc token epoch).

### 8.4 Chế độ tự đánh (manual)
Người dùng chỉnh φ (kéo đường ngắm), a/b (widget điểm chạm), θ, V0 → gọi `simulate` (fine, recordSegments) **throttle 30 ms** trong worker → vẽ đường dự đoán realtime + nhãn "Ghi điểm / Không / Đá bi". Nút "Phân tích độ chắc" chạy bước 5–6 cho cú hiện tại.

---

## 9. Chỉ dẫn cho cơ thủ (instruct.ts)

```ts
export interface HumanInstruction {
  aim: {
    mode: 'ball-first' | 'rail-first';
    ghostBall?: { x: number; y: number };     // bi trước: vị trí bi ma
    thickness?: { fraction: number; label: string; side: 'trái' | 'phải' }; // "chạm trái 1/4"
    railPoint?: { cushion: CushionId; diamond: number; throughDiamond: boolean }; // băng trước: "băng dài trên, nút 3,2"
    systemNumber?: { systemId: string; value: number };   // "bộ 50: ngắm 26"
  };
  tip: { clock: number; tips: number; a: number; b: number }; // "2 giờ, 2 tip"
  elevationDeg: number;                                        // "nâng cơ ~5°"
  speed: { V0: number; level: number; levelLabel: string };    // "lực 4/10 (~3 chiều dài bàn)"
  stroke: 'thuong' | 'cule' | 'tro' | 'dan' | 'masse' | 'bo';  // thường/culê/trô/dằn/mát-xê/cú bổ
  english: 'thuận' | 'nghịch' | 'không';
  summaryVi: string;                                           // câu hướng dẫn hoàn chỉnh, sinh theo template
}
```
Quy đổi:
- **Độ dày**: `fraction = 1 − |sin(cut)|`, cut = góc giữa hướng bi cái tại thời điểm chạm và đường nối tâm. Nhãn gần nhất trong {1/8 … 7/8, đầy}.
- **Giờ & tip**: `clock = (atan2(a, b) theo độ / 30 + 12) mod 12` (12 giờ = thượng, 3 giờ = phải); `tips = √(a²+b²) / TIP_UNIT_R`, mặc định **`TIP_UNIT_R = 0.15`** (3 tip = 0,45R, sát giới hạn trượt cơ) **[CẦN HLV DUYỆT]** — cấu hình được trong Cài đặt.
- **Lực**: `level` = số chiều dài bàn bi cái lăn tự do được với V0 đó trên bàn hiện tại (tính bằng engine, không va chạm), làm tròn 1–10 **[CẦN HLV DUYỆT thang lực]**.
- **Kiểu đánh**: θ > 45° → mát-xê; θ > 20° và |b| nhỏ → cú bổ; b > 0.2 → culê; b < −0.2 → trô; |b| ≤ 0.2 và bi trượt khi chạm bi 1 → dằn; còn lại thường.
- **summaryVi** (template): "Đánh {bi trước/băng trước} vào {bi đỏ/vàng}: ngắm {…}, điểm chạm {clock} giờ {tips} tip ({english}), nâng cơ {θ}°, lực {level}/10. Bi cái đi {railCode alias}, về {băng/nút}."

---

## 10. Bộ số (systems/)

### 10.1 Nguyên tắc dữ liệu
Mỗi bộ số lưu thành dữ liệu (không chỉ công thức): phương trình, **bản đồ đánh số** trên từng băng (giá trị ↔ tọa độ trên mũi băng), quy ước ngắm (xuyên nút / trước mặt nút / trộn theo ngưỡng), spin & lực chuẩn, **bảng hiệu chỉnh** (nội suy tuyến tính), phạm vi áp dụng, lỗi thường gặp, nguồn, độ tin cậy. Thang mặc định **×10** (góc = 50), có chế độ hiển thị Corner-5 ×1.

```ts
// src/content/schema.ts (Zod → type)
export interface SystemDefinition {
  id: string;                                    // 'bo-50', 'plus', 'cup-ndn'
  names: { vi: string; en: string; ko?: string; aliases: string[] };
  family: 'corner5_subtractive' | 'plus_additive' | 'cup_additive' | 'other';
  equation: string;                              // hiển thị, ví dụ 'Ngắm = Đầu − Trúng'
  railSequence: string;                          // 'LSL'
  firstContact: 'rail' | 'ball';
  arrivalRailIndex: 3 | 4;
  aimReference: 'through_diamond' | 'opposite_diamond' | { mixedThreshold: number };
  numbering: {                                   // value ↔ vị trí dọc theo băng, đơn vị NÚT tính từ góc tham chiếu
    start: Array<{ value: number; cushion: CushionId; diamond: number }>;
    aim: Array<{ value: number; cushion: CushionId; diamond: number }>;
    arrival: Array<{ value: number; cushion: CushionId; diamond: number }>;
  };
  base: { spinTips: number; english: 'thuận' | 'nghịch'; speedNote: string };
  corrections: Array<{ variable: 'start' | 'spinTips' | 'speed' | 'cloth'; points: Array<[number, number]>; note: string; confidence: 'verified' | 'single_source' | 'conflicting' }>;
  validStartRange: [number, number];
  failureModes: string[];
  sources: Array<{ title: string; url: string }>;
  reviewStatus: 'draft' | 'coach_reviewed';
}
```
Bản đồ đánh số được biểu diễn theo **hướng chuẩn** (bi cái xuất phát gần góc dưới-trái, đi lên băng dài L2 trước). `numbering.ts` cung cấp hàm chuyển giữa hướng chuẩn và 8 phép đối xứng của bàn để áp cho mọi thế bi.

### 10.2 Bộ 50 (Corner-5 / 5½ / Diamond) — thế sườn L-S-L
- Công thức: **Điểm ngắm = Điểm đầu + SaiSố(Điểm đầu) − Điểm trúng**.
- Bản đồ đánh số (nguồn Bida Hoàng Anh Nam; [CẦN HLV DUYỆT]):
  - **Điểm đầu**: trên băng dài: nút 2 = 20 … nút 7 = 45 (mỗi nút +5 về phía góc); trên băng ngắn: góc (góc dậu) = 50, nút 1 = 60, nút 2 = 70, nút 3 = 90, góc đối diện = 100.
  - **Điểm ngắm** (băng dài đối diện): góc = 0, nút 1 = 10, nút 2 = 20, nút 3 = 30, nút 4 = 40, nút 5 = 50, nút 6 = 70, nút 7 = 90.
  - **Điểm trúng** (băng 3, đọc tại **mũi băng**): 0, 10, 20, 30, 40, giữa nút 4–5 = 50, nút 5 = 60, nút 6 = 80.
- Quy ước ngắm: **điểm đầu ≥ 50 → ngắm xuyên băng vào nút; < 50 → ngắm trước mặt nút** (`mixedThreshold: 50`).
- Sai số theo điểm đầu: `20:−6, 30:−4, 35:−3, 40:−2, 45:−1, 50:0, 60:+3, 70:+5, 80:+8, 90:+10, 100:+13`. Ví dụ: đầu 30, về 20 → ngắm 30 − 4 − 20 = **6** (đánh vào 6 thay vì 10). Test bắt buộc: `bo50Aim(30, 20) === 6`, `bo50Aim(70, 30) === 45`.
- Spin chuẩn: 2 ép phê thuận (về băng 3), 3 ép phê (băng 4), 4 ép phê (4–5 băng). Lực trung bình ("lực 5–6"); mọi công thức chỉ đúng ở lực trung bình.
- Hiệu chỉnh băng 4 với 3 ép phê theo điểm đầu: `20:+6, 30:+4, 40:+2, 50:0, 60:−3, 70:−5, 90:−9`.
- Quy đổi ép phê ↔ điểm: 1 tip ≈ 7 điểm (Hàn: 1 tip≈7, 2≈14, 3≈20; Atlas VN: 1EP=+7, 2EP=+14, 3EP=+21).
- Bài thử bàn **"50-30-20"**: đặt đầu 50, ngắm 30, 2 ép phê, lực trung bình, đánh 3–5 lần; về đúng 20 thì đó là lượng ép phê chuẩn của bàn → dùng cho hiệu chuẩn (§12).

### 10.3 Plus — chạm băng ngắn trước (S-L-L)
- Công thức: **Điểm trúng (băng 3) = Điểm bi cái + Điểm băng 1**, thang ×10, góc không coi là 0. Ví dụ: đầu 20, muốn về 50 → ngắm 30. Spin chuẩn: thượng 2 tip. Không dùng khi đầu 0–30. Rất nhạy với spin và lực (1 nút trên băng ngắn = 2 nút trên băng dài).
- Bản đồ đánh số chi tiết: **[CẦN HLV CUNG CẤP]** — tạo file với `reviewStatus: 'draft'` và bảng đánh số tạm theo mô tả Hàn (băng 1: vùng góc–nút 1 = 20, nút 1 = 30, nửa nút trên = 40).
- Lưu ý nội dung: tên "Plus 2" chỉ ít nhất 3 thứ khác nhau tùy cộng đồng — bài viết phải nói rõ.

### 10.4 Cúp N-D-N (ngắn–dài–ngắn, VN)
- Công thức: **Điểm trúng = Vị trí bi chủ + Vị trí bi carde + Ép phê**, thang ½ nút = 1. Gốc: chạm trái ¼, không ép phê → bi chủ về thẳng góc dậu.
- Ví dụ: 2 + 1 = 3 nhưng cần về 2 → ép phê −1 ("ép phê dằn 1"). 0 + (−3) → cần ép phê 3 để về 0 (chạm trái ¼, ép phê 3, lực 3 băng).

### 10.5 SystemMatch trong solver
Với phương án băng-trước có railCode trùng `railSequence` của một bộ số, tính: điểm đầu (giao đường đi bi cái với băng tham chiếu theo bản đồ), điểm ngắm thực tế (điểm chạm băng 1 mô phỏng → giá trị), điểm về mô phỏng (điểm chạm băng 3 → giá trị), và điểm về **bộ số dự đoán**. Hiển thị: **"Bộ 50: 50 − 30 = 20 · Mô phỏng trên bàn của bạn: về 22"**.

### 10.6 Máy tính bộ số (trang /bo-so/[id])
Form: điểm đầu, điểm trúng mong muốn (hoặc điểm ngắm), số ép phê → kết quả kèm sai số; sơ đồ SVG cập nhật realtime; nút "Mở trong phòng tập" (dựng thế bi + strike theo bộ số rồi mô phỏng thật để so sánh).

---

## 11. Phần Lý thuyết

### 11.1 Danh mục (category)
| slug | Tên | Ví dụ nội dung |
|---|---|---|
| `co-ban` | Cơ bản | Cầm cơ, tư thế, bắc cầu, nhịp đánh, nhắm |
| `diem-cham-va-xoay` | Điểm chạm & xoáy | Hệ giờ + tip, culê, trô, dằn, ép phê thuận/nghịch, squirt |
| `do-day-va-goc` | Độ dày & góc | ¼–½–¾ bi, quy tắc 30°/90°, throw |
| `luc` | Lực | Thang lực, lực 3 băng, ảnh hưởng của lực lên bộ số |
| `bo-so` | Bộ số | Bộ 50, Plus, cúp N-D-N, Bola, Atlas, Tüzül (link sang /bo-so) |
| `the-bi` | Thế bi | Thế sườn, cúp, a băng, bi trước, vòng bàn*, ô (umbrella)*, ngược (reverse)* |
| `ky-thuat-nang-cao` | Nâng cao | Mát-xê, cú bổ, kiểm soát đá bi, kiss-back |
| `chien-thuat` | Chiến thuật & gom bi | Vị trí bi sau cú đánh, phòng thủ |
| `bai-tap` | Bài tập | Drill theo cấp độ, mở thẳng trong phòng tập |

(*) thuật ngữ **[CHƯA KIỂM CHỨNG]** trong nguồn Việt — dùng tên tiếng Anh kèm theo cho tới khi HLV duyệt.

### 11.2 Frontmatter bài viết (Zod)
```ts
export const ArticleFrontmatter = z.object({
  title: z.string(),
  category: z.enum(['co-ban','diem-cham-va-xoay','do-day-va-goc','luc','bo-so','the-bi','ky-thuat-nang-cao','chien-thuat','bai-tap']),
  level: z.enum(['nhap-mon','co-ban','trung-cap','nang-cao']),
  tags: z.array(z.string()),
  railCode: z.string().optional(),          // facet lọc
  firstContact: z.enum(['ball','rail']).optional(),
  english: z.enum(['thuận','nghịch','không']).optional(),
  systemIds: z.array(z.string()).default([]),
  diagrams: z.array(z.string()).default([]), // id DiagramSpec trong content/drills
  aliases: z.array(z.string()).default([]),
  summary: z.string(),
  reviewStatus: z.enum(['draft','coach_reviewed']).default('draft'),
  sources: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
});
```
MDX được dùng component: `<Diagram id="..." />`, `<SystemCalc id="bo-50" />`, `<Term id="ep-phe" />` (tooltip thuật ngữ), `<OpenInPractice drill="..." />`.

### 11.3 DiagramSpec — một nguồn cho cả SVG và phòng tập
```ts
export const DiagramSpec = z.object({
  id: z.string(),
  table: z.enum(['UMB_MATCH','MID_2540','KR_DOMESTIC_MID','HALF_MATCH','SMALL']).default('UMB_MATCH'),
  balls: z.object({ white: Pos, yellow: Pos, red: Pos }),   // Pos = { x: diamonds, y: diamonds }
  cue: z.enum(['white','yellow']).default('white'),
  strike: z.object({ phiDeg: z.number(), thetaDeg: z.number(), a: z.number(), b: z.number(), V0: z.number() }).optional(),
  paths: z.array(z.object({ ball: z.enum(['white','yellow','red']), points: z.array(Pos), style: z.enum(['solid','dashed']) })).optional(),
  annotations: z.array(z.discriminatedUnion('type', [
    z.object({ type: z.literal('label'), at: Pos, text: z.string() }),
    z.object({ type: z.literal('arrow'), from: Pos, to: Pos }),
    z.object({ type: z.literal('systemOverlay'), systemId: z.string() }), // vẽ thang số của bộ số lên khung
  ])).default([]),
  caption: z.string().optional(),
});
```
- Nếu có `strike` mà không có `paths` → SVG lấy đường đi bằng cách chạy engine **lúc build** (`scripts/build-content.ts`) và lưu kết quả vào JSON sinh ra. Đảm bảo sơ đồ lý thuyết và phòng tập nhất quán.
- `DiagramSvg`: bàn (khung, nỉ, nút, thang số tùy chọn), bi, đường đi (`d3-shape` line), animation vẽ dần bằng `stroke-dashoffset` khi cuộn tới (IntersectionObserver), tôn trọng `prefers-reduced-motion`.

### 11.4 Tìm kiếm tiếng Việt
```ts
// src/lib/viFold.ts — NFD KHÔNG tách đ/Đ, phải map riêng
export function viFold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}
```
- MiniSearch: index các trường `title^3, aliases^3, tags^2, summary, body`; `processTerm: viFold`; thêm **trường thứ hai có dấu** để xếp hạng khớp có dấu cao hơn; fuzzy 0.2, prefix true.
- **Từ đồng nghĩa** (mở rộng query) từ `glossary.json`: {ép phê, áp phê, epphe, effe, EP} · {culê, cule, cu lê, coulé, follow} · {trô, đờ trô, retro, kéo, giật, draw} · {mát-xê, masse, massé, nhồi*} · {carde, cadre, trái C} · {đá, đá bi, kiss} · {a băng, múa, bank} · {bộ 50, hệ 50, 5½, corner 5, diamond system}.
- Test: "ep phe" → ra bài "Ép phê"; "bo 50" → ra hệ bộ 50; "cule" → "Culê".
- Bộ lọc (facet, query string để chia sẻ link): category, level, railCode, firstContact, english, systemIds, chỉ bài đã duyệt.

### 11.5 Glossary
`content/glossary.json`: `{ id, term, aliases[], en, definition, origin?, confidence: 'verified'|'unverified', sources[] }`. Khởi tạo từ bảng thuật ngữ trong báo cáo nghiên cứu: băng/băng dài/băng ngắn, nút, bộ số, điểm đầu/đánh/trúng, sai số, góc dậu, ép phê (thuận/dằn-nghịch), culê, trô, dằn, mát-xê, cú bổ, đánh dày/mỏng, chạm trái ¼, đá bi, a băng, bi chủ, carde, giò gà, gom bi, dợt thử bàn, thế sườn, thế cúp. **Lưu ý mâu thuẫn**: một nguồn VN định nghĩa "áp phê thuận/nghịch" là đánh trên/dưới tâm — app theo nghĩa chuẩn (xoáy ngang cùng/ngược chiều di chuyển) và ghi chú mâu thuẫn trong bài.

### 11.6 Nội dung khởi tạo (Phase 1)
Tạo **≥ 25 bài** dạng `draft` (khung nội dung + nguồn, để HLV viết lại/duyệt): mỗi category 2–4 bài; 3 file hệ thống (`bo-50.json` đầy đủ, `plus.json` draft, `cup-ndn.json`); ≥ 12 drill DiagramSpec (gồm "50-30-20", quy tắc 30°, quy tắc 90°, thế sườn cơ bản, cúp N-D-N cơ bản, bi trước ½ bi, kiss-back…). Không sao chép nguyên văn nội dung từ các blog — viết lại và trích nguồn.

---

## 12. Hiệu chuẩn bàn (features/calibration)

Wizard 3 bước, lưu kết quả vào `TableProfile.calibration`:
1. **Thử lăn**: đặt bi tại băng S1 giữa bàn, đánh dằn thẳng về S2 với "lực lag" (bi về gần S1 sau 2 lượt chiều dài); người dùng nhập bi dừng ở đâu (kéo bi trên bàn ảo hoặc nhập số nút) — 3 lần. → khớp `muRoll` (và ước lượng `eCushion` theo năng lượng mất ở băng).
2. **Thử bộ 50 "50-30-20"**: hướng dẫn đặt bi ở điểm 50, ngắm 30, 2 ép phê, lực trung bình; người dùng nhập điểm về băng 3 thực tế — 3–5 lần. → khớp `eCushion`, `muCushion` (và tùy chọn `cushionContactSin`) bằng lưới thô + golden-section, hàm mất mát = Σ(điểm về mô phỏng − thực tế)² theo đơn vị nút.
3. **(Tùy chọn) Nhập trực tiếp**: người nâng cao chỉnh tay các tham số.

```ts
export interface TableCalibration {
  steps: Array<'roll' | 'system-50-30-20' | 'manual'>;
  fitted: Partial<PhysicsParams>;
  rmsDiamonds: number;              // sai số còn lại
  samples: number;
  playsLongShortDiamonds: number;   // hiển thị: "Bàn chạy dài +0,4 nút"
  fittedAt: string;
}
```
Hiển thị kết quả bằng ngôn ngữ cơ thủ: "Bàn này chạy **dài** 0,4 nút so với chuẩn; nỉ **nhanh**".

---

## 13. Phòng tập (features/practice) — UI & 3D

### 13.1 Luồng
1. Chọn **bàn** (profile đã lưu hoặc preset) → 2. Chọn **bi cái** (trắng/vàng) → 3. **Đặt bi** → 4. Bấm **"Tìm cách đánh"** → danh sách phương án (stream) → 5. Chọn một phương án → **xem hướng dẫn + phát lại** → 6. (tùy chọn) chuyển **Tự đánh** để thử biến thể → 7. **Lưu thế bi** (IndexedDB, có tên, ghi chú).

### 13.2 Scene 3D (R3F)
- `<Canvas dpr={[1, 2]} frameloop="demand" shadows={false}>`; khi phát lại đặt `frameloop="always"`, xong trả về `demand`. `<PerformanceMonitor>` + `<AdaptiveDpr>` của drei.
- **Bàn**: nỉ (plane, màu xanh dương mặc định, chọn được), băng (mesh hộp vát theo profile với chiều cao mũi băng đúng), khung gỗ, **nút** (đĩa nhỏ trên khung đúng `diamondOffset`), tùy chọn hiển thị **thang số bộ số** trên khung.
- **Bi**: `sphereGeometry(R, 48, 32)`, `meshStandardMaterial` roughness ~0.25, **texture có chấm** (kiểu bi 6 chấm) để nhìn thấy bi xoay; ánh sáng: 1 hemisphere + 1 directional; bóng đổ dùng `ContactShadows` (rẻ) thay cho shadow map.
- **Phát lại**: vị trí lấy từ `evalBall(segment, t)` (giải tích, mỗi frame), hướng lấy từ `BakedShot.quats` (slerp giữa 2 mẫu). Không tính vật lý trong `useFrame`.
- **Vết đường đi**: `<Line>` của drei (Line2, nét dày thật trên mobile), mỗi bi một màu; vết hiện dần theo thời gian phát lại (cập nhật `geometry.instanceCount` qua ref, không re-render React). Điểm chạm băng/bi đánh dấu chấm nhỏ + số thứ tự (1, 2, 3…). Va chạm **kiss** đánh dấu biểu tượng cảnh báo màu cam.
- **Bi ma (ghost ball)** tại vị trí chạm bi mục tiêu 1; **bi mờ** tại vị trí dừng dự đoán + **ellipse** 1σ từ Monte Carlo.
- **Quạt xác suất**: 32–64 đường Monte Carlo vẽ bằng một `LineSegments` alpha thấp (một draw call).
- **Cơ**: mesh hình trụ côn (dài 1,42 m, đầu cơ 12 mm, đuôi 30 mm), đặt sao cho đầu cơ chạm `rQ` (§6.2) theo hướng `−ĉ`, nghiêng θ. Animation trước khi phát: kéo cơ lùi 15 cm (0,6 s) → đẩy tới (0,15 s) → t=0 của mô phỏng trùng lúc chạm bi. Sau khi chạm, cơ đi theo thêm 10 cm rồi mờ dần.
- **Hai camera** (chuyển bằng nút, animation ~400 ms):
  1. **Top-down trực giao** (mặc định khi đặt bi): toàn bàn vừa khung, không méo — đo theo nút chính xác.
  2. **Góc cơ thủ** (phối cảnh, FOV ~50°): đặt sau bi cái dọc hướng −ĉ, cao ~0,35 m, nhìn theo đường ngắm — cho học viên thấy đúng cảnh ngoài bàn thật.
  `OrbitControls` chỉ bật ở chế độ xem tự do; khóa khi đang kéo bi.

### 13.3 Đặt bi (PlacementControls)
- Kéo bi bằng pointer events trên plane nỉ (`e.point`), kẹp trong vùng hợp lệ và chặn chồng bi (đẩy ra theo pháp tuyến).
- Canvas đặt `touch-action: none`.
- **Kính lúp (Loupe)**: khi kéo trên màn hình cảm ứng, hiển thị vòng phóng to 2.5× phía trên ngón tay (render-to-texture hoặc camera phụ), có thước nút.
- Bảng tinh chỉnh: nút ±1 mm / ±5 mm theo x, y; ô nhập tọa độ theo nút (ví dụ x = 2,75 nút); toggle **snap ¼ nút**.
- Nút nhanh: "Xếp khai cuộc", "Đặt ngẫu nhiên", "Hoàn tác/Làm lại" (lịch sử 50 bước).

### 13.4 Danh sách phương án (ShotList)
Mỗi thẻ: nhãn họ thế bi ("Băng trước · Thế sườn (L-S-L) · Ép phê thuận"), bi mục tiêu thứ nhất (chấm màu), **% ghi điểm (mô phỏng)** với khoảng tin cậy, **rủi ro đá bi**, độ khó (1–5 sao), điểm thế bi để lại, dòng bộ số ("Bộ 50: 50−30=20 · mô phỏng 22"). Sắp xếp được theo: điểm tổng / dễ nhất / an toàn nhất (ít kiss) / thế bi để lại tốt nhất. Chọn mức trình độ (ảnh hưởng nhiễu) ở đầu danh sách.

### 13.5 Bảng hướng dẫn (InstructionPanel)
- **Widget điểm chạm (TipWidget)** — SVG: hình tròn bi cái, vạch giờ 12 vị trí, vòng 1/2/3 tip, **vòng giới hạn trượt cơ (đỏ)**, chấm điểm chạm; ở chế độ tự đánh thì kéo được.
- **Độ nghiêng cơ**: hình minh họa nghiêng + số độ.
- **Hướng ngắm**: bi trước → "chạm trái ¼ bi đỏ" + bi ma trên bàn; băng trước → "ngắm băng dài trên, nút 3,2 (xuyên nút)" + giá trị bộ số nếu có.
- **Lực**: thang 1–10 + m/s + mô tả.
- **Kiểu đánh & ép phê**: culê/trô/dằn/mát-xê; thuận/nghịch.
- **Câu tóm tắt** (`summaryVi`).
- **Dòng thời gian sự kiện**: "Chạm băng 1 (L2, nút 3,2) → băng 2 (S2) → chạm bi đỏ → băng 3 (L1) → chạm bi vàng ✓". Bấm từng mục để nhảy tới thời điểm đó.

### 13.6 Thanh phát lại (PlaybackBar)
Play/Pause, tua (scrubber), tốc độ 0.25× / 0.5× / 1×, nhảy sự kiện trước/sau, lặp lại, bật/tắt: vết, quạt xác suất, bi ma, cơ.

### 13.7 Responsive
- **Ngang (≥ 2:1 khả dụng)**: bàn chiếm tối đa, panel phải (danh sách/hướng dẫn) có thể thu gọn.
- **Dọc (mobile)**: bàn trên cùng (full width, tỉ lệ 2:1), bên dưới là **bottom sheet** (shadcn Drawer) 3 nấc: thu gọn (chỉ thanh phát lại) / nửa (danh sách hoặc hướng dẫn) / đầy.
- Gợi ý xoay ngang khi ở chế độ phát lại góc cơ thủ (không bắt buộc, không dùng API khóa xoay).
- Mục tiêu chạm: ≥ 44 px. Kiểm tra trên viewport 360×780, 390×844, 768×1024, 1440×900.

### 13.8 Store (Zustand) — khung
```ts
interface PracticeState {
  table: TableProfile; cue: BallId;
  balls: Record<BallId, { x: number; y: number }>;
  history: Array<Record<BallId, { x: number; y: number }>>; future: typeof this.history;
  mode: 'place' | 'solve' | 'review' | 'manual';
  skill: SkillLevel;
  options: ShotOption[]; selectedId?: string; solving: boolean; solveEpoch: number;
  manualStrike: CueStrike;
  current?: { result: ShotResult; baked: BakedShot; fan?: Float32Array[] };
  playback: { t: number; playing: boolean; speed: 0.25 | 0.5 | 1 };
  camera: 'top' | 'shooter' | 'free';
  layers: { trails: boolean; fan: boolean; ghosts: boolean; cue: boolean; systemOverlay?: string };
}
```
`playback.t` cập nhật bằng ref trong `useFrame` (không setState mỗi frame); chỉ đồng bộ vào store khi pause/seek.

---

## 14. Kế hoạch triển khai theo Phase (Claude Code làm tuần tự)

### Phase 0 — Khung dự án + engine lõi + benchmark (ưu tiên số 1)
**Việc:**
- Khởi tạo Next.js + TS strict + Tailwind v4 + shadcn/ui + ESLint (rule cấm import UI trong engine/solver) + Vitest + Playwright. Script: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`, `bench`, `content:build`.
- `src/engine`: types, vec, params, table (5 preset), motion (4 trạng thái), quartic (+ test), events, resolve/cue, resolve/ballBall, resolve/cushion/impulse + mathavan (fine & fast), simulate, rules, bake.
- Trang `/dev/bench`: chạy 1.000 cú ngẫu nhiên trên main thread và trong worker, in p50/p95 thời gian/cú (fast & fine), số sự kiện trung bình.
- `scripts/bench.ts` cho Node.

**Test bắt buộc (Vitest):**
1. Trượt→lăn: cú dằn 3 m/s, μs = 0.2 → thời gian trượt 0.44 s ± 1%, quãng trượt 1.12 m ± 2%, tốc độ khi bắt đầu lăn = 5/7·v0 ± 1%.
2. Cơ ngang θ=0: ball speed khớp công thức TP A.30; b>0 → topspin, b<0 → backspin; a>0 → squirt lệch đúng phía.
3. Quy tắc 90° (dằn, va ½ bi): góc tách 90° ± 3° (khi bỏ throw) và trong khoảng hợp lý khi bật throw.
4. Quy tắc 30° (lăn, va ½ bi): bi cái lệch 30°–36° sau khi về lăn; với ¼ và ¾ bi: 25°–30°.
5. Băng: bi lăn vuông góc vào băng, không spin → bật thẳng ngược lại, tốc độ ≈ e_c·v (model impulse) và hợp lý (Mathavan); áp phê thuận làm góc bật **rộng hơn**, nghịch làm **hẹp hơn** so với không ép phê (so sánh định tính).
6. Mathavan fast vs fine: sai lệch góc bật < 0.3° trên lưới 9 góc tới × 5 spin.
7. Bảo toàn/tiêu hao: động năng không tăng qua va chạm bi–bi khi e_b ≤ 1 (property test, fast-check, 1.000 trường hợp ngẫu nhiên); không bi nào ra khỏi bàn; không hai bi chồng nhau ở bất kỳ thời điểm nào (lấy mẫu 1 ms).
8. Luật 3 băng: bộ test event log tổng hợp (ghi điểm khi đủ 3 băng trước bi 2; không ghi điểm khi chỉ 2 băng; băng sau bi 1 vẫn tính; kiss được ghi nhận).
9. Kịch bản thế sườn "50-30-20" trên `UMB_MATCH` với tham số mặc định: bi cái chạm L-S-L và về vùng giá trị 10–30 (kiểm tra định tính, sẽ chặt hơn sau hiệu chuẩn).

**Done khi:** tất cả test xanh; bench cho số liệu thật (ghi vào `docs/DECISIONS.md`); mục tiêu tham khảo: fast ≤ 0.5 ms/cú p95 trên laptop. Nếu chậm hơn 5× mục tiêu → ghi ADR và đề xuất (bảng tra phản hồi băng / Rust→WASM) **trước khi** sang Phase 2.

### Phase 1 — Lý thuyết (có thể làm song song khi Phase 0 đang tối ưu)
- Content pipeline (Zod, MDX, `build-content.ts`, MiniSearch index), `viFold` + test.
- Trang `/ly-thuyet` (search + facet + URL query), bài viết, `/thuat-ngu`, `/bo-so` + `/bo-so/[id]` với **máy tính bộ số** (`bo50Aim` + test).
- `DiagramSvg` + animation vẽ dần; component MDX (`Diagram`, `SystemCalc`, `Term`).
- Nội dung khởi tạo theo §11.6.
- **Done khi:** build tĩnh thành công; tìm "ep phe", "bo 50", "cule" ra đúng; lọc theo railCode hoạt động; Lighthouse mobile ≥ 90 (Performance, Accessibility) cho trang bài viết.

### Phase 2 — Phòng tập: đặt bi + tự đánh + phát lại 3D
- Worker + Comlink + pool; Scene 3D (bàn, bi có chấm, nút, camera top & shooter), PlacementControls + Loupe, chế độ tự đánh (TipWidget, θ, lực, kéo hướng ngắm), simulate + bake, phát lại (vết, cơ, sự kiện, thanh phát lại), responsive + bottom sheet, chọn preset bàn, lưu/mở thế bi.
- **Done khi:** 60 fps khi phát lại trên điện thoại tầm trung (Chrome Android) và iPhone (Safari) — đo bằng `PerformanceMonitor`; đường dự đoán ở chế độ tự đánh cập nhật ≤ 50 ms sau thao tác; e2e: đặt 3 bi → đánh thử → thấy dòng thời gian sự kiện.

### Phase 3 — Solver + danh sách phương án + hướng dẫn chi tiết
- Pipeline §8.2 (seed, sweep, window, tolerance, Monte Carlo, leave, classify, instruct, SystemMatch, xếp hạng), streaming, hủy khi kéo bi, quạt xác suất + ellipse, ShotList, InstructionPanel.
- Bộ **20 thế bi chuẩn** trong `src/solver/__tests__/layouts.ts` (gồm thế sườn, cúp, bi trước, hai bi sát băng, bi dính, thế khó). Test: mỗi thế có ≥ 1 phương án ghi điểm (trừ thế được đánh dấu "không có lời giải dễ"); mọi phương án trả về đều thực sự ghi điểm khi simulate fine không nhiễu.
- **Done khi:** phương án đầu tiên ≤ 1 s, hoàn tất ≤ 3 s trên laptop (ghi số liệu điện thoại vào DECISIONS); HLV đánh giá trên 20 thế chuẩn ≥ 70% phương án top-3 là "hợp lý" (ghi kết quả vào `docs/REVIEW.md`).

### Phase 4 — Hiệu chuẩn bàn + so sánh mô hình
- Wizard §12, fit tham số, hiển thị "bàn chạy dài/ngắn", lưu profile; trang `/ban` quản lý profile.
- Thêm `han2005` (sau khi đối chiếu phương trình gốc), công tắc so sánh mô hình băng ở `/dev`.
- (Tùy chọn) golden test so với **pooltool** (Python) — script xuất 50 cú chuẩn ra JSON; so sánh vị trí sau va chạm đầu tiên và thứ tự sự kiện.
- **Done khi:** với dữ liệu thử 50-30-20 nhập tay, RMS sau fit ≤ 0,5 nút; profile áp dụng ngay cho solver.

### Phase 5 — Hoàn thiện
- PWA (offline cho phòng tập + bài đã xem), cài đặt (TIP_UNIT_R, thang lực, màu nỉ, hiển thị thang ×1/×10), chia sẻ thế bi bằng URL (encode layout + strike ngắn gọn, ví dụ base64url), trang giới thiệu, analytics tối giản (không thu thập dữ liệu cá nhân).
- Tối ưu: nếu bench Phase 0 cho thấy cần → port engine sang Rust/WASM sau interface `simulate` (giữ nguyên API).

---

## 15. Ngân sách hiệu năng (mục tiêu, phải đo lại ở Phase 0/2/3)

| Hạng mục | Laptop | Điện thoại tầm trung |
|---|---|---|
| `simulate` fast (p95) | ≤ 0.5 ms | ≤ 2 ms |
| `simulate` fine + bake | ≤ 10 ms | ≤ 40 ms |
| Solver: phương án đầu | ≤ 300 ms | ≤ 1 s |
| Solver: hoàn tất | ≤ 1.5 s | ≤ 3–4 s |
| Phát lại 3D | 60 fps | ≥ 50 fps |
| JS tải trang lý thuyết | ≤ 150 KB gzip (không có three) | |
| JS tải phòng tập | ≤ 450 KB gzip | |

Hai ước lượng trong nghiên cứu chênh nhau ~100 lần (20–100 µs vs ≤ 8 ms mỗi cú) → **số đo thật ở Phase 0 là quyết định**.

---

## 16. Kiểm thử & chất lượng
- Unit + property test cho engine/solver (Vitest, fast-check). Coverage engine ≥ 85%.
- Golden test: lưu kết quả `simulate` của 30 cú chuẩn vào `__golden__/*.json`; so sánh với dung sai (vị trí 1e-6 m, thời gian sự kiện 1e-7 s). Thay đổi có chủ đích → cập nhật golden kèm ghi chú trong PR/commit.
- Lưu `ENGINE_VERSION` (semver) trong mọi thế bi/kết quả lưu; khi mở lại thì **mô phỏng lại** thay vì tin dữ liệu cũ.
- Playwright: smoke các trang, e2e luồng phòng tập, screenshot test cho DiagramSvg (ổn định, không animation).
- Accessibility: điều khiển phát lại & danh sách dùng được bằng bàn phím; contrast đạt AA; `prefers-reduced-motion` tắt animation trang trí.

---

## 17. Câu hỏi mở cho HLV (ghi vào docs/OPEN_QUESTIONS.md, không chặn việc build)
1. Quy đổi **tip** ↔ độ lệch tâm: 1 tip = bao nhiêu R? (mặc định 0,15R)
2. **Thang lực** 1–10 dạy học viên thế nào? (mặc định: số chiều dài bàn bi lăn được)
3. Bản đồ đánh số & sai số **bộ 50** ở §10.2 có đúng như anh dạy không? Bảng **Plus** đầy đủ?
4. Thuật ngữ chưa kiểm chứng: "đánh ô" (umbrella), "vòng bàn", "tic tắc", "đánh ngược", "nhồi", "3 băng cha/con", "bàn trung/bàn đại".
5. Bàn phăng ở VN: kích thước lòng bàn, chiều cao băng, cỡ bi (61,5 hay 65,5)?
6. Trọng số "thế bi để lại tốt" (§8.2 bước 7).
7. Danh sách thế bi chuẩn dùng để nghiệm thu solver (§14 Phase 3).
8. Hệ số mặc định cho bàn ở CLB của anh (dùng làm "bàn chuẩn" để hiệu chuẩn preset).

---

## 18. Tài liệu tham khảo kỹ thuật (để Claude Code tra cứu)
- pooltool (Apache-2.0): https://github.com/ekiefl/pooltool — docs https://pooltool.readthedocs.io — lý thuyết https://ekiefl.github.io/2020/04/24/pooltool-theory/ — thuật toán event-based https://ekiefl.github.io/2020/12/20/pooltool-alg/
- Dr. Dave Alciatore technical proofs: TP A.30 (cue strike), A.31 (squirt), A.14 (throw), A.19 (massé), B.17 (miscue): https://billiards.colostate.edu/technical_proofs/ — thông số vật lý: https://billiards.colostate.edu/faq/physics/physical-properties/
- Mathavan, Jackson, Parkin (2010), cushion model: https://billiards.colostate.edu/physics_articles/Mathavan_IMechE_2010.pdf
- Leckie & Greenspan, event-based pool physics: https://core.ac.uk/display/24665996
- UMB World Rules (thiết bị): http://files.umb-carom.org/Public/Rules/Carom_Rules.pdf
- CueCard (search + Monte Carlo cho billiards): https://yoavshoham.net/_files/ugd/a1a3b1_5964a39d807a4fce8768f64cb69d6b25.pdf
- Bộ 50 (VN): https://bidahoanganhnam.vn/bo-nut-so-bi-3-bang/ · https://bidathanhhien.com/huong-dan-cach-tinh-bo-so-50-trong-bida-carom-3-bang-de-hieu · Cúp N-D-N: https://vncarom.com/bo-cup-ngan-dai-ngan-bida-3-bang · Plus (KR): https://inprod.co.kr/3%EC%BF%A0%EC%85%98-%EB%8B%B9%EA%B5%AC-%ED%94%8C%EB%9F%AC%EC%8A%A4-%EC%8B%9C%EC%8A%A4%ED%85%9C/
- Chỉ đọc để đối chiếu hành vi (GPL-3.0, KHÔNG copy code): https://github.com/tailuge/billiards
