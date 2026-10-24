import { BookOpen, Crosshair, Hash } from 'lucide-react';
import { Link } from 'react-router';
import { articles, findSystem } from '@/content/loader';
import { t } from '@/i18n/vi';
import { Ball, TableSvg } from '@/features/theory/TableSvg';
import { AuthorCard, RoleModelCard } from '@/components/AuthorCard';

/** The 50-30-20 path in diamonds: cue near the corner → L2 at 5 → S2 → L1 at 6. */
const HERO_PATH: Array<[number, number]> = [
  [0.55, 0.42],
  [4.98, 3.91],
  [7.91, 1.76],
  [6.02, 0.09],
  [2.9, 2.75],
];

const ENTRIES = [
  {
    to: '/phong-tap',
    icon: Crosshair,
    title: t.nav.practice,
    body: 'Đặt lại thế bi bạn đang gặp. App tìm các đường ghi điểm, chỉ điểm chạm, độ nghiêng cơ, lực, và phát lại đường đi của cả ba bi.',
  },
  {
    to: '/ly-thuyet',
    icon: BookOpen,
    title: t.nav.theory,
    body: 'Điểm chạm và xoáy, độ dày, lực, các thế bi quen thuộc. Tìm được cả khi gõ không dấu.',
  },
  {
    to: '/bo-so',
    icon: Hash,
    title: t.nav.systems,
    body: 'Máy tính bộ 50, Plus và cúp N-D-N, có sơ đồ và sai số theo điểm đầu.',
  },
];

export function Home() {
  const bo50 = findSystem('bo-50');
  const starters = articles.filter((a) => a.level === 'nhap-mon' || a.level === 'co-ban').slice(0, 5);
  return (
    <>
      <section className="room bg-bg text-fg">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-8 md:grid-cols-[1fr_1.25fr] md:items-center md:gap-12 md:pb-16 md:pt-14">
          <div>
            <p className="text-[0.9375rem] font-medium text-muted">Bộ 50 trên bàn 2,84 m</p>
            <h1 className="num mt-2 text-[clamp(4rem,21vw,8.5rem)] font-bold leading-[0.85] tracking-tight" aria-label="Đầu 50 trừ ngắm 30 bằng về 20">
              <span aria-hidden="true">
                50<span className="px-[0.12em] font-medium text-muted">−</span>30<span className="px-[0.12em] font-medium text-muted">=</span>20
              </span>
            </h1>
            <p className="mt-5 max-w-[34ch] text-lg leading-relaxed text-fg/85">
              Đặt thế bi, xem đường đi của bi trước khi bước ra bàn thật.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/phong-tap" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-cloth px-5 text-base font-semibold text-white hover:bg-cloth-light">
                <Crosshair size={20} aria-hidden="true" /> Vào phòng tập
              </Link>
              <Link to="/bo-so/bo-50" className="inline-flex min-h-12 items-center rounded-xl border border-line px-5 text-base font-semibold hover:bg-surface-2">
                Thử máy tính bộ 50
              </Link>
            </div>
          </div>
          <div>
            <TableSvg title="Đường bi bộ 50: đầu 50, ngắm 30, về 20" system={bo50} className="hero-table w-full drop-shadow-[0_24px_40px_rgba(0,0,0,0.45)]">
              <polyline
                className="hero-path"
                points={HERO_PATH.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke="#fff"
                strokeWidth={0.05}
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength={1}
              />
              <Ball x={0.55} y={0.42} color="var(--color-ball-white)" />
              <Ball x={4.98} y={1.13} color="var(--color-ball-yellow)" />
              <Ball x={2.82} y={2.86} color="var(--color-ball-red)" />
            </TableSvg>
            <p className="mt-3 text-sm text-muted">
              Số trên khung: đầu (trắng ngà), ngắm (vàng), về (xanh nhạt). Mô phỏng sẽ khác đôi chút theo từng bàn.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <ul className="divide-y divide-line border-y border-line">
          {ENTRIES.map((e) => (
            <li key={e.to}>
              <Link to={e.to} className="group flex gap-4 py-5">
                <e.icon size={24} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <span>
                  <span className="block text-lg font-semibold group-hover:text-accent">{e.title}</span>
                  <span className="mt-1 block max-w-[62ch] text-muted">{e.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <AuthorCard />
        <RoleModelCard />

        {starters.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold">Nên đọc trước</h2>
            <ol className="mt-4 grid gap-x-8 gap-y-1 md:grid-cols-2">
              {starters.map((a, i) => (
                <li key={a.slug}>
                  <Link to={`/ly-thuyet/${a.category}/${a.slug}`} className="flex gap-3 rounded-lg py-3 hover:text-accent">
                    <span className="num w-6 shrink-0 text-xl font-semibold text-muted">{i + 1}</span>
                    <span>
                      <span className="block font-semibold">{a.title}</span>
                      <span className="line-clamp-2 text-sm text-muted">{a.summary}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </>
  );
}
