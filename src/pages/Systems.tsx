import { Link } from 'react-router';
import { systems } from '@/content/loader';
import { Pill } from '@/components/ui/Chip';
import { t } from '@/i18n/vi';

export function SystemsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-5">
      <h1 className="text-2xl font-bold">{t.systems.title}</h1>
      <p className="mt-2 max-w-[60ch] text-muted">
        Bộ số giúp tính điểm ngắm từ vị trí bi cái và điểm muốn về. Mọi công thức chỉ đúng ở lực trung bình và cần chỉnh theo từng bàn.
      </p>
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {systems.map((s) => (
          <li key={s.id}>
            <Link to={`/bo-so/${s.id}`} className="group block py-5">
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-xl font-bold group-hover:text-accent">{s.names.vi}</span>
                <span className="num text-lg font-semibold text-muted">{s.railSequence.split('').join('-')}</span>
                {s.reviewStatus === 'draft' && <Pill tone="warn">Bản nháp</Pill>}
              </span>
              <span className="num mt-2 block text-2xl font-semibold">{s.equation}</span>
              <span className="mt-1 block max-w-[62ch] text-muted">{s.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
      {systems.length === 0 && <p className="py-10 text-muted">Chưa có bộ số nào. Chạy pnpm content:build để nạp nội dung.</p>}
    </div>
  );
}
