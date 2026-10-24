import { Gauge, Target } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { speedLevel } from '@/solver/instruct';
import { railCode } from '@/engine/rules';
import { cn } from '@/lib/cn';
import { numVi, pct } from '@/lib/format';
import { t } from '@/i18n/vi';
import { usePractice } from '../store';
import { EventTimeline } from './InstructionPanel';
import { TipWidget } from './TipWidget';

const DEG = Math.PI / 180;

function PredictionBadge() {
  const p = usePractice((s) => s.prediction);
  if (!p) return <p className="text-sm text-muted">Đang tính đường đi…</p>;
  const r = p.rules;
  const kiss = r.kisses.length > 0;
  const label = r.scored ? t.practice.scored : kiss ? t.practice.kiss : t.practice.missed;
  const tone = r.scored ? 'bg-score/15 text-score' : kiss ? 'bg-kiss/15 text-kiss' : 'bg-surface-2 text-muted';
  const detail = r.secondObject
    ? `${r.cushionsBeforeSecond} băng trước bi thứ hai${r.cueCushionSeq.length ? ` (${railCode(r.cueCushionSeq).split('').join('-')})` : ''}`
    : r.firstObject
      ? 'Chỉ chạm một bi mục tiêu'
      : 'Không chạm bi mục tiêu nào';
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <span className={cn('rounded-lg px-3 py-1.5 text-base font-bold', tone)}>{label}</span>
      <span className="text-sm text-muted">{detail}</span>
    </div>
  );
}

export function ManualStrikePanel() {
  const strike = usePractice((s) => s.manualStrike);
  const table = usePractice((s) => s.table);
  const tipUnitR = usePractice((s) => s.settings.tipUnitR);
  const analysis = usePractice((s) => s.analysis);
  const current = usePractice((s) => s.current);
  const { setManual, strikeManual, analyzeManual } = usePractice.getState();
  const level = useMemo(() => speedLevel(table, strike.V0, strike.theta), [table, strike.V0, strike.theta]);
  const phiDeg = ((strike.phi / DEG) % 360 + 360) % 360;

  return (
    <div className="flex flex-col gap-5">
      <PredictionBadge />
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-sm font-medium text-muted">Hướng đánh</span>
          <span className="num text-lg font-semibold">{numVi(phiDeg, 1)}°</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[-1, -0.1, 0.1, 1].map((d) => (
            <button key={d} type="button" onClick={() => setManual({ phi: strike.phi + d * DEG })} className="num min-h-11 cursor-pointer rounded-lg border border-line text-base font-semibold hover:bg-surface-2">
              {d > 0 ? '+' : '−'}
              {numVi(Math.abs(d), 1)}°
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">Kéo ngón tay trên bàn để xoay hướng, kéo bi để dời bi.</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6">
        <TipWidget a={strike.a} b={strike.b} tipUnitR={tipUnitR} limit={table.physics.miscueLimit} onChange={(a, b) => setManual({ a, b })} />
      </div>

      <Slider label="Nâng cơ" value={Math.round(strike.theta / DEG)} min={0} max={60} step={1} format={(v) => `${v}°`} onChange={(v) => setManual({ theta: v * DEG })} hint="Trên 20° là cú bổ, trên 45° là mát-xê." />
      <Slider label="Lực" value={strike.V0} min={0.8} max={7} step={0.1} format={() => `${level}/10`} onChange={(v) => setManual({ V0: v })} hint={`${numVi(strike.V0)} m/s ở đầu cơ, khoảng ${level} chiều dài bàn.`} />

      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" className="justify-center" onClick={() => void strikeManual()}>
          <Target size={18} aria-hidden="true" /> {t.practice.strike}
        </Button>
        <Button className="justify-center" onClick={() => void analyzeManual()} disabled={analysis === 'loading'}>
          <Gauge size={18} aria-hidden="true" /> {analysis === 'loading' ? 'Đang phân tích…' : t.practice.analyze}
        </Button>
      </div>
      {analysis && analysis !== 'loading' && (
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-bg p-3">
          <div>
            <dt className="text-sm text-muted">Ghi điểm (mô phỏng)</dt>
            <dd className="num text-2xl font-bold">
              {pct(analysis.pScore)} <span className="text-sm font-normal text-muted">{pct(analysis.pScoreCI[0])}–{pct(analysis.pScoreCI[1])}</span>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Rủi ro đá bi</dt>
            <dd className="num text-2xl font-bold">{pct(analysis.kissRisk)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-sm text-muted">Dung sai</dt>
            <dd className="num font-semibold">
              Hướng {numVi(analysis.tolerance.phiDeg[0], 2)}° … +{numVi(analysis.tolerance.phiDeg[1], 2)}°, lực {numVi(analysis.tolerance.speedPct[0], 0)}% … +{numVi(analysis.tolerance.speedPct[1], 0)}%
            </dd>
          </div>
        </dl>
      )}
      {current?.source === 'manual' && <EventTimeline />}
    </div>
  );
}
