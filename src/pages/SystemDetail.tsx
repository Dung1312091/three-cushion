import { ChevronLeft, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { findSystem } from '@/content/loader';
import { Pill } from '@/components/ui/Chip';
import { SystemCalculator } from '@/features/theory/SystemCalculator';
import { t } from '@/i18n/vi';
import { numVi } from '@/lib/format';
import { NotFound } from './NotFound';

export function SystemDetail() {
  const { id = '' } = useParams();
  const def = findSystem(id);
  if (!def) return <NotFound />;
  return (
    <div className="mx-auto max-w-3xl px-4 pt-4">
      <Link to="/bo-so" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted hover:text-fg">
        <ChevronLeft size={18} aria-hidden="true" /> {t.systems.title}
      </Link>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-3xl font-bold">{def.names.vi}</h1>
        <span className="num text-xl font-semibold text-muted">{def.railSequence.split('').join('-')}</span>
        {def.reviewStatus === 'draft' && <Pill tone="warn">Bản nháp — chờ HLV duyệt</Pill>}
      </div>
      <p className="mt-1 text-sm text-muted">
        {[def.names.en, def.names.ko, ...def.names.aliases].filter(Boolean).join(', ')}
      </p>
      <p className="mt-4 max-w-[62ch] text-lg leading-relaxed">{def.summary}</p>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-4 sm:p-6" aria-labelledby="calc">
        <h2 id="calc" className="mb-4 text-lg font-bold">
          {t.systems.calc}
        </h2>
        <SystemCalculator id={def.id} />
      </section>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-bold">Cú chuẩn</h2>
          <p className="mt-1 text-muted">
            {numVi(def.base.spinTips)} tip ép phê {def.base.english}. {def.base.speedNote}.
          </p>
        </div>
        <div>
          <h2 className="font-bold">{t.systems.validRange}</h2>
          <p className="num mt-1 text-2xl font-semibold">
            {def.validStartRange[0]}–{def.validStartRange[1]}
          </p>
        </div>
      </section>

      {def.corrections.map((c) => (
        <section key={c.variable + c.note} className="mt-8">
          <h2 className="font-bold">
            Bảng hiệu chỉnh theo {c.variable === 'start' ? 'điểm đầu' : c.variable === 'spinTips' ? 'số tip' : c.variable === 'speed' ? 'lực' : 'nỉ'}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {c.note} {c.confidence !== 'verified' && '(một nguồn, chưa đối chiếu)'}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="num w-full min-w-max border-collapse text-center text-lg">
              <tbody>
                <tr className="border-b border-line">
                  <th scope="row" className="py-2 pr-3 text-left font-sans text-sm font-medium text-muted">
                    {c.variable === 'start' ? 'Đầu' : 'Giá trị'}
                  </th>
                  {c.points.map(([x]) => (
                    <td key={x} className="px-2 py-2 font-semibold">
                      {x}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-3 text-left font-sans text-sm font-medium text-muted">
                    Chỉnh
                  </th>
                  {c.points.map(([x, y]) => (
                    <td key={x} className="px-2 py-2">
                      {y > 0 ? `+${y}` : y}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {def.failureModes.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold">{t.systems.failureModes}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-fg/90">
            {def.failureModes.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      {def.sources.length > 0 && (
        <section className="mt-8 border-t border-line pt-6">
          <h2 className="text-base font-bold">{t.theory.sources}</h2>
          <ul className="mt-2">
            {def.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] text-accent hover:underline">
                  {s.title} <ExternalLink size={14} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
