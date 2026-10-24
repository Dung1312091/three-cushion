import { ChevronLeft, ExternalLink } from 'lucide-react';
import { useEffect, useState, type ComponentType } from 'react';
import { Link, useParams } from 'react-router';
import { findArticle, loadArticleBody } from '@/content/loader';
import { Pill } from '@/components/ui/Chip';
import { PageLoading } from '@/components/PageLoading';
import { mdxComponents } from '@/features/theory/mdxComponents';
import { t } from '@/i18n/vi';
import { NotFound } from './NotFound';

type Body = ComponentType<{ components?: Record<string, unknown> }>;

export function ArticlePage() {
  const { category = '', slug = '' } = useParams();
  const meta = findArticle(category, slug);
  const key = `${category}/${slug}`;
  const [loaded, setLoaded] = useState<{ key: string; Body: Body } | null>(null);
  const Body = loaded?.key === key ? loaded.Body : null;

  useEffect(() => {
    const p = loadArticleBody(category, slug);
    let alive = true;
    p?.then((m) => alive && setLoaded({ key: `${category}/${slug}`, Body: m.default }));
    return () => {
      alive = false;
    };
  }, [category, slug]);

  useEffect(() => {
    if (meta) document.title = `${meta.title} — Ba Băng`;
    return () => {
      document.title = 'Ba Băng';
    };
  }, [meta]);

  if (!meta) return <NotFound />;

  return (
    <article className="mx-auto max-w-3xl px-4 pt-4">
      <Link to={`/ly-thuyet?cat=${meta.category}`} className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted hover:text-fg">
        <ChevronLeft size={18} aria-hidden="true" /> {t.categories[meta.category]}
      </Link>
      <h1 className="mt-2 text-[1.875rem] font-bold leading-tight sm:text-4xl">{meta.title}</h1>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Pill>{t.levels[meta.level]}</Pill>
        <Pill>{t.theory.readMinutes(meta.readingMinutes)}</Pill>
        {meta.railCode && <Pill tone="info">{meta.railCode.split('').join('-')}</Pill>}
        {meta.english && <Pill tone="info">Ép phê {meta.english}</Pill>}
      </div>
      {meta.reviewStatus === 'draft' && (
        <p className="mt-4 rounded-xl border border-kiss/30 bg-kiss/10 px-4 py-3 text-sm">
          {t.review.draft}. Nội dung có thể thay đổi; chỗ ghi “CẦN HLV DUYỆT” là phần chưa chốt.
        </p>
      )}
      <p className="mt-5 text-lg leading-relaxed text-fg/85">{meta.summary}</p>

      <div className="prose-vi mt-6">{Body ? <Body components={mdxComponents} /> : <PageLoading label="Đang tải bài…" />}</div>

      {meta.sources.length > 0 && (
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="text-base font-bold">{t.theory.sources}</h2>
          <ul className="mt-2 space-y-1">
            {meta.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] text-accent underline-offset-4 hover:underline">
                  {s.title} <ExternalLink size={14} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
