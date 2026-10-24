import { BookA, Hash, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { articles, type ArticleMeta } from '@/content/loader';
import { CATEGORIES, LEVELS } from '@/content/schema';
import { search, type SearchHit } from '@/content/search';
import { Chip, Pill } from '@/components/ui/Chip';
import { t } from '@/i18n/vi';

const FACETS = ['cat', 'level', 'rail', 'fc', 'en'] as const;

function matches(a: ArticleMeta, p: URLSearchParams): boolean {
  const cat = p.get('cat');
  const level = p.get('level');
  const rail = p.get('rail');
  const fc = p.get('fc');
  const en = p.get('en');
  if (cat && a.category !== cat) return false;
  if (level && a.level !== level) return false;
  if (rail && a.railCode !== rail) return false;
  if (fc && a.firstContact !== fc) return false;
  if (en && a.english !== en) return false;
  if (p.get('rev') === '1' && a.reviewStatus !== 'coach_reviewed') return false;
  return true;
}

function ArticleRow({ a }: { a: ArticleMeta }) {
  return (
    <li>
      <Link to={`/ly-thuyet/${a.category}/${a.slug}`} className="group block py-4">
        <span className="block text-[1.0625rem] font-semibold leading-snug group-hover:text-accent">{a.title}</span>
        <span className="mt-1 line-clamp-2 block text-[0.9375rem] text-muted">{a.summary}</span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          <Pill>{t.levels[a.level]}</Pill>
          <Pill>{t.theory.readMinutes(a.readingMinutes)}</Pill>
          {a.railCode && <Pill tone="info">{a.railCode.split('').join('-')}</Pill>}
          {a.reviewStatus === 'coach_reviewed' && <Pill tone="ok">Đã duyệt</Pill>}
        </span>
      </Link>
    </li>
  );
}

export function TheoryList() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [query, setQuery] = useState(q);
  const [result, setResult] = useState<{ q: string; hits: SearchHit[] } | null>(null);
  const hits = q.trim() && result?.q === q ? result.hits : null;
  const [showFilters, setShowFilters] = useState(FACETS.slice(1).some((f) => params.get(f)));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.get('focus')) inputRef.current?.focus();
  }, [params]);

  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (query) next.set('q', query);
      else next.delete('q');
      next.delete('focus');
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 200);
    return () => clearTimeout(id);
  }, [query, params, setParams]);

  useEffect(() => {
    let alive = true;
    if (!q.trim()) return;
    search(q).then((h) => alive && setResult({ q, hits: h }));
    return () => {
      alive = false;
    };
  }, [q]);

  const setFacet = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (!value || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const railCodes = useMemo(() => [...new Set(articles.map((a) => a.railCode).filter(Boolean) as string[])].sort(), []);
  const filtered = articles.filter((a) => matches(a, params));
  const activeCount = FACETS.filter((f) => params.get(f)).length + (params.get('rev') ? 1 : 0);

  let list: React.ReactNode;
  if (hits) {
    const visible = hits.filter((h) => {
      if (h.kind !== 'article') return activeCount === 0;
      const a = articles.find((x) => `a:${x.category}/${x.slug}` === h.id);
      return a ? matches(a, params) : false;
    });
    list =
      visible.length === 0 ? (
        <p className="py-10 text-muted">{t.theory.empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((h) => {
            if (h.kind === 'article') {
              const a = articles.find((x) => `a:${x.category}/${x.slug}` === h.id);
              return a ? <ArticleRow key={h.id} a={a} /> : null;
            }
            const Icon = h.kind === 'term' ? BookA : Hash;
            return (
              <li key={h.id}>
                <Link to={h.href} className="group flex gap-3 py-4">
                  <Icon size={18} className="mt-1 shrink-0 text-muted" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold group-hover:text-accent">
                      {h.title} <span className="font-normal text-muted">— {h.kind === 'term' ? 'thuật ngữ' : 'bộ số'}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[0.9375rem] text-muted">{h.summary}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      );
  } else {
    const groups = CATEGORIES.map((c) => ({ c, items: filtered.filter((a) => a.category === c) })).filter((g) => g.items.length);
    list =
      groups.length === 0 ? (
        <p className="py-10 text-muted">{t.theory.empty}</p>
      ) : (
        groups.map((g) => (
          <section key={g.c} className="mt-8 first:mt-4" aria-labelledby={`cat-${g.c}`}>
            <h2 id={`cat-${g.c}`} className="flex items-baseline gap-2 border-b border-line pb-2 text-lg font-bold">
              {t.categories[g.c]}
              <span className="num text-base font-medium text-muted">{g.items.length}</span>
            </h2>
            <ul className="divide-y divide-line">
              {g.items.map((a) => (
                <ArticleRow key={a.slug} a={a} />
              ))}
            </ul>
          </section>
        ))
      );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-5">
      <h1 className="text-2xl font-bold">{t.theory.title}</h1>
      <div className="sticky top-14 z-20 -mx-4 bg-bg/95 px-4 pb-3 pt-3 backdrop-blur">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Tìm kiếm</span>
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.theory.searchPlaceholder}
              className="h-12 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-base outline-none focus:border-accent"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            className="relative flex h-12 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3.5 font-medium"
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span className="hidden sm:inline">{t.theory.filters}</span>
            {activeCount > 0 && <span className="num rounded-full bg-accent px-1.5 text-sm text-accent-fg">{activeCount}</span>}
          </button>
        </div>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <Chip active={!params.get('cat')} onClick={() => setFacet('cat', null)}>
            Tất cả
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={params.get('cat') === c} onClick={() => setFacet('cat', c)}>
              {t.categories[c]}
            </Chip>
          ))}
        </div>
        {showFilters && (
          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-surface p-3">
            <FacetRow label="Trình độ">
              {LEVELS.map((l) => (
                <Chip key={l} active={params.get('level') === l} onClick={() => setFacet('level', l)}>
                  {t.levels[l]}
                </Chip>
              ))}
            </FacetRow>
            {railCodes.length > 0 && (
              <FacetRow label="Mã thế bi">
                {railCodes.map((r) => (
                  <Chip key={r} active={params.get('rail') === r} onClick={() => setFacet('rail', r)}>
                    {r.split('').join('-')}
                  </Chip>
                ))}
              </FacetRow>
            )}
            <FacetRow label="Chạm đầu">
              <Chip active={params.get('fc') === 'ball'} onClick={() => setFacet('fc', 'ball')}>
                Bi trước
              </Chip>
              <Chip active={params.get('fc') === 'rail'} onClick={() => setFacet('fc', 'rail')}>
                Băng trước
              </Chip>
            </FacetRow>
            <FacetRow label="Ép phê">
              {(['thuận', 'nghịch', 'không'] as const).map((e) => (
                <Chip key={e} active={params.get('en') === e} onClick={() => setFacet('en', e)}>
                  {e[0].toUpperCase() + e.slice(1)}
                </Chip>
              ))}
            </FacetRow>
            <div className="flex items-center justify-between gap-3">
              <Chip active={params.get('rev') === '1'} onClick={() => setFacet('rev', '1')}>
                {t.theory.reviewedOnly}
              </Chip>
              {activeCount > 0 && (
                <button
                  type="button"
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm font-semibold text-accent"
                  onClick={() => {
                    const next = new URLSearchParams();
                    if (q) next.set('q', q);
                    setParams(next, { replace: true });
                  }}
                >
                  <X size={16} aria-hidden="true" /> {t.theory.clearFilters}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="mt-1 text-sm text-muted" aria-live="polite">
        {hits ? `${hits.length} kết quả cho “${q}”` : t.theory.results(filtered.length)}
      </p>
      {list}
    </div>
  );
}

function FacetRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
