import { Gauge, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Segmented } from '@/components/ui/Segmented';
import { Slider } from '@/components/ui/Slider';
import type { BallId } from '@/engine/types';
import { speedLevel, strokeOf } from '@/solver/instruct';
import { railCode } from '@/engine/rules';
import { cn } from '@/lib/cn';
import { numVi, pct } from '@/lib/format';
import { t } from '@/i18n/vi';
import { usePractice } from '../store';
import { aimPhi, BALL_VI, bridgeOf, cueAngleOf, deliveryOf, spinOf, THICKNESS, thicknessKey, type CueAngleKey, type Side, type ThicknessKey } from '../vocab';
import { BallAim, EventTimeline, Field, Notes, Section } from './InstructionPanel';
import { TipWidget } from './TipWidget';

const DEG = Math.PI / 180;
const DOT: Record<BallId, string> = { white: 'bg-ball-white', yellow: 'bg-ball-yellow', red: 'bg-ball-red' };
const THICK_KEYS: ThicknessKey[] = ['full', '3/4', '1/2', '1/4', 'thin'];
/** Quick cue-ball contacts, in tips (1 tip = tipUnitR). */
const SPIN_PRESETS: Array<{ label: string; a: number; b: number }> = [
  { label: 'Tâm', a: 0, b: 0 },
  { label: 'Cu-lê', a: 0, b: 2 },
  { label: 'Trô', a: 0, b: -2 },
  { label: 'Ép trái', a: -2, b: 0 },
  { label: 'Ép phải', a: 2, b: 0 },
];
const CUE_PRESETS: Array<{ label: string; deg: number; keys: CueAngleKey[] }> = [
  { label: 'Song song', deg: 2, keys: ['flat', 'low'] },
  { label: 'Chúi 20°', deg: 20, keys: ['raised'] },
  { label: 'Dựng 55°', deg: 55, keys: ['vertical'] },
];

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

/** Aim the way players do: pick the object ball, the thickness and the side; the app turns it into a direction. */
function ObjectBallAim() {
  const strike = usePractice((s) => s.manualStrike);
  const balls = usePractice((s) => s.balls);
  const cue = usePractice((s) => s.cue);
  const R = usePractice((s) => s.table.ballRadius);
  const contact = usePractice((s) => s.prediction?.contact);
  const setManual = usePractice((s) => s.setManual);
  const [picked, setPicked] = useState<BallId>();
  const targets = (['white', 'yellow', 'red'] as BallId[]).filter((b) => b !== cue);
  const direct = contact && contact.railsBefore === 0 ? contact : undefined;
  const obj = picked && picked !== cue ? picked : (direct?.object ?? 'red');
  const live = direct?.object === obj ? direct : undefined;
  const key = live ? thicknessKey(live.fraction) : undefined;
  const side: Side = live?.side ?? 'trái';
  const phiDeg = (((strike.phi / DEG) % 360) + 360) % 360;

  const aim = (o: BallId, k: ThicknessKey, s: Side) => {
    setPicked(o);
    setManual({ phi: aimPhi(balls[cue], balls[o], R, THICKNESS[k].fraction, s) });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Chạm</span>
        {targets.map((b) => (
          <Chip key={b} active={obj === b} onClick={() => aim(b, key ?? '1/2', side)} className="gap-2">
            <span className={cn('h-3.5 w-3.5 rounded-full ring-1 ring-black/25', DOT[b])} aria-hidden="true" /> {BALL_VI[b]}
          </Chip>
        ))}
      </div>
      <Segmented<ThicknessKey | ''>
        size="sm"
        label="Độ dày"
        value={key ?? ''}
        onChange={(k) => k && aim(obj, k, side)}
        options={THICK_KEYS.map((k) => ({ value: k, label: THICKNESS[k].short, title: THICKNESS[k].name }))}
        className="w-full"
      />
      <Segmented<Side | ''>
        size="sm"
        label="Bên chạm"
        value={live && key !== 'full' ? side : ''}
        onChange={(s) => s && aim(obj, key && key !== 'full' ? key : '1/2', s)}
        options={[
          { value: 'trái', label: 'Bên trái bi' },
          { value: 'phải', label: 'Bên phải bi' },
        ]}
        className="w-full"
      />
      {contact ? (
        direct ? (
          <BallAim contact={direct} cue={cue} />
        ) : (
          <p className="text-sm text-muted">
            Đánh băng trước: bi cái chạm {contact.railsBefore} băng rồi mới tới {BALL_VI[contact.object]}.
          </p>
        )
      ) : (
        <p className="text-sm text-muted">Hướng hiện tại không chạm bi mục tiêu nào.</p>
      )}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-sm font-medium text-muted">Chỉnh hướng tinh</span>
          <span className="num text-base font-semibold">{numVi(phiDeg, 1)}°</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[-1, -0.1, 0.1, 1].map((d) => (
            <button key={d} type="button" onClick={() => setManual({ phi: strike.phi + d * DEG })} className="num min-h-11 cursor-pointer rounded-lg border border-line text-base font-semibold hover:bg-surface-2">
              {d > 0 ? '+' : '−'}
              {numVi(Math.abs(d), 1)}°
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">Có ép phê ngang thì bi cái bị lệch hướng (squirt), độ dày thực tế ở trên đã tính cả phần lệch này. Kéo ngón tay trên bàn để xoay hướng, kéo bi để dời bi.</p>
      </div>
    </div>
  );
}

function CueBallControls({ ballFirst }: { ballFirst: boolean }) {
  const strike = usePractice((s) => s.manualStrike);
  const tipUnitR = usePractice((s) => s.settings.tipUnitR);
  const limit = usePractice((s) => s.table.physics.miscueLimit);
  const setManual = usePractice((s) => s.setManual);
  const spin = spinOf(strike.a, strike.b, tipUnitR, undefined, ballFirst);
  const m = Math.hypot(strike.a, strike.b);
  const depth = (n: number) => setManual({ a: (strike.a / m) * n * tipUnitR, b: (strike.b / m) * n * tipUnitR });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-4">
        <TipWidget a={strike.a} b={strike.b} tipUnitR={tipUnitR} limit={limit} onChange={(a, b) => setManual({ a, b })} size={148} caption={false} />
        <div className="min-w-40 flex-1">
          <p className="text-lg font-semibold leading-snug">{spin.name}</p>
          <p className="num text-[0.9375rem] font-medium text-accent">{spin.where}</p>
          <Notes lines={spin.effects} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Điểm chạm nhanh">
        {SPIN_PRESETS.map((p) => (
          <Chip
            key={p.label}
            active={Math.abs(strike.a - p.a * tipUnitR) < 1e-3 && Math.abs(strike.b - p.b * tipUnitR) < 1e-3}
            onClick={() => setManual({ a: p.a * tipUnitR, b: p.b * tipUnitR })}
          >
            {p.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Độ sâu điểm chạm">
        <span className="text-sm text-muted">Độ sâu</span>
        {[1, 2, 3].map((n) => (
          <Chip key={n} active={m > 1e-6 && Math.round(m / tipUnitR) === n} disabled={m < 1e-6} onClick={() => depth(n)} className="disabled:cursor-default disabled:opacity-40">
            {n} tip
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function ManualStrikePanel() {
  const strike = usePractice((s) => s.manualStrike);
  const table = usePractice((s) => s.table);
  const tipUnitR = usePractice((s) => s.settings.tipUnitR);
  const analysis = usePractice((s) => s.analysis);
  const current = usePractice((s) => s.current);
  const contact = usePractice((s) => s.prediction?.contact);
  const { setManual, strikeManual, analyzeManual } = usePractice.getState();
  const level = useMemo(() => speedLevel(table, strike.V0, strike.theta), [table, strike.V0, strike.theta]);
  const deg = Math.round(strike.theta / DEG);
  const angle = cueAngleOf(deg);
  const stroke = strokeOf(strike, false);
  const spin = spinOf(strike.a, strike.b, tipUnitR);
  const bridge = bridgeOf(level, stroke, spin.vertical);
  const delivery = deliveryOf(stroke, spin, analysis && analysis !== 'loading' ? analysis.kissRisk : 0);

  return (
    <div className="flex flex-col gap-3">
      <PredictionBadge />

      <Section step={1} title="Bi mục tiêu">
        <ObjectBallAim />
      </Section>

      <Section step={2} title="Bi cái — điểm chạm">
        <CueBallControls ballFirst={!contact || contact.railsBefore === 0} />
      </Section>

      <Section step={3} title="Cơ & ra cơ">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Góc đặt cơ nhanh">
            {CUE_PRESETS.map((p) => (
              <Chip key={p.label} active={p.keys.includes(angle.key)} onClick={() => setManual({ theta: p.deg * DEG })}>
                {p.label}
              </Chip>
            ))}
          </div>
          <Slider label="Góc cơ" value={deg} min={0} max={60} step={1} format={(v) => `${v}°`} onChange={(v) => setManual({ theta: v * DEG })} hint={angle.note ? `${angle.text}. ${angle.note}` : `${angle.text}.`} />
          <Slider label="Lực" value={strike.V0} min={0.8} max={7} step={0.1} format={() => `${level}/10`} onChange={(v) => setManual({ V0: v })} hint={`${numVi(strike.V0)} m/s ở đầu cơ, bi đi khoảng ${level} chiều dài bàn.`} />
          <dl className="grid gap-2 text-[0.9375rem] sm:grid-cols-2">
            <Field label="Cầu tay" value={bridge.name} note={bridge.why} />
            <Field label="Ra cơ" value={delivery.name} note={delivery.why} />
          </dl>
        </div>
      </Section>

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
