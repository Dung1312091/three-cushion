import { Mail } from 'lucide-react';
import { t, type AuthorTitle } from '@/i18n/vi';
import { cn } from '@/lib/cn';

const RANK_LABEL: Record<NonNullable<AuthorTitle['rank']>, string> = { 1: 'Vô địch', 2: 'Á quân', 3: 'Hạng ba' };
const RANK_DOT: Record<NonNullable<AuthorTitle['rank']>, string> = {
  1: 'bg-[#e8b923]',
  2: 'bg-[#c7ccd4]',
  3: 'bg-[#c98a55]',
};

/** Gold cup drawn inline (no image request, crisp at any size). */
export function Trophy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} role="img" aria-label="Cúp vô địch">
      <defs>
        <linearGradient id="cup-gold" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#b8861f" />
          <stop offset="0.35" stopColor="#f6d264" />
          <stop offset="0.55" stopColor="#fff1b8" />
          <stop offset="0.75" stopColor="#e2b23a" />
          <stop offset="1" stopColor="#9c6f16" />
        </linearGradient>
        <linearGradient id="cup-base" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5a3a24" />
          <stop offset="1" stopColor="#3a2416" />
        </linearGradient>
      </defs>
      {/* Handles */}
      <path d="M28 26 H12 c0 22 8 34 24 38" fill="none" stroke="url(#cup-gold)" strokeWidth="7" strokeLinecap="round" />
      <path d="M92 26 H108 c0 22 -8 34 -24 38" fill="none" stroke="url(#cup-gold)" strokeWidth="7" strokeLinecap="round" />
      {/* Bowl */}
      <path d="M26 14 H94 V34 c0 24 -14 40 -34 42 c-20 -2 -34 -18 -34 -42 Z" fill="url(#cup-gold)" />
      <path d="M26 14 H94" stroke="#fff4c2" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      {/* Three balls on the bowl: the carom signature */}
      <circle cx="46" cy="40" r="6.5" fill="#f4f3ec" />
      <circle cx="60" cy="50" r="6.5" fill="#f2c230" stroke="#9c6f16" strokeWidth="1" />
      <circle cx="74" cy="40" r="6.5" fill="#cc2936" />
      {/* Stem + plinth */}
      <path d="M54 76 h12 l3 20 h-18 Z" fill="url(#cup-gold)" />
      <rect x="40" y="96" width="40" height="8" rx="2" fill="url(#cup-gold)" />
      <rect x="32" y="104" width="56" height="26" rx="3" fill="url(#cup-base)" />
      <rect x="44" y="111" width="32" height="10" rx="1.5" fill="#e2b23a" opacity="0.9" />
    </svg>
  );
}

function TitleList({ titles }: { titles: AuthorTitle[] }) {
  return (
    <ol className="mt-2 divide-y divide-line">
      {titles.map((tt) => (
        <li key={`${tt.year}-${tt.title}`} className="flex items-baseline gap-4 py-2.5">
          <span className="num w-12 shrink-0 text-xl font-bold">{tt.year}</span>
          <span className="flex min-w-0 items-baseline gap-2">
            {tt.rank && <span className={cn('h-2.5 w-2.5 shrink-0 translate-y-[-1px] rounded-full', RANK_DOT[tt.rank])} aria-hidden="true" />}
            <span>
              {tt.rank && <span className="font-semibold">{RANK_LABEL[tt.rank]} </span>}
              {tt.title}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** "Tấm gương" — a Vietnamese champion's titles, clearly credited to him and kept apart from the author's bio. */
export function RoleModelCard() {
  const r = t.app.roleModel;
  return (
    <section aria-labelledby="role-model-title" className="room mt-6 overflow-hidden rounded-2xl bg-bg text-fg md:grid md:grid-cols-[220px_1fr]">
      <div className="flex items-center justify-center px-6 pb-2 pt-8 md:py-8">
        <Trophy className="h-36 w-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] md:h-44" />
      </div>
      <div className="p-5 sm:p-6">
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          {r.highlights.map((h) => (
            <div key={h.label} className="flex items-baseline gap-2">
              <dt className="sr-only">{h.label}</dt>
              <dd className="num text-5xl font-bold leading-none text-ball-yellow">{h.value}</dd>
              <dd className="max-w-[17ch] text-sm leading-snug text-fg/85">{h.label}</dd>
            </div>
          ))}
        </dl>
        <TitleList titles={r.titles} />
        <p className="mt-3 text-xs text-muted">Thành tích của VĐV DungLQ là bịa đặt :), giới thiệu để học viên lấy làm động lực; không phải thành tích của tác giả app.</p>
      </div>
    </section>
  );
}

/** Author bio with titles. The titles block (and the cup) only render when real titles are filled in vi.ts. */
export function AuthorCard() {
  const a = t.app.author;
  const titles = a.titles;
  const has = titles.length > 0;
  return (
    <section
      aria-labelledby="author-title"
      className={cn('mt-12 overflow-hidden rounded-2xl border border-line bg-surface', has && 'md:grid md:grid-cols-[220px_1fr]')}
    >
      {has && (
        <div className="room flex items-center justify-center bg-bg px-6 py-8">
          <Trophy className="h-36 w-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] md:h-44" />
        </div>
      )}
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {!has && (
            <span className="num flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cloth text-xl font-bold text-white" aria-hidden="true">
              DL
            </span>
          )}
          <div>
            <h2 id="author-title" className="text-xl font-bold">
              Tác giả: {a.name}
            </h2>
            <p className="mt-1 max-w-[60ch] text-muted">
              {a.role[0].toUpperCase() + a.role.slice(1)}. Các bài lý thuyết, bộ số và thế bi trong app do anh biên soạn và duyệt dần; bài còn ghi “bản nháp” là phần đang chờ duyệt.
            </p>
          </div>
        </div>

        {has && (
          <>
            <h3 className="mt-5 text-sm font-semibold text-muted">Thành tích</h3>
            <TitleList titles={titles} />
          </>
        )}

        <a href={`mailto:${a.email}`} className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-accent underline-offset-4 hover:underline">
          <Mail size={18} aria-hidden="true" /> {a.email}
        </a>
      </div>
    </section>
  );
}
