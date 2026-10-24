import { Crosshair, Minus, Plus as PlusIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import type { SystemDefinition } from '@/content/schema';
import { findSystem } from '@/content/loader';
import { Segmented } from '@/components/ui/Segmented';
import { bo50Correction, bo50TipShift, cupEnglishNeeded, plusAim, plusValid, positionOf } from '@/systems';
import { numVi } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Ball, DIAMOND_OFFSET_D, TableSvg } from './TableSvg';

function Stepper({ label, value, onChange, min, max, step = 5 }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  const id = useId();
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <div className="flex items-center rounded-xl border border-line bg-surface">
        <button type="button" className="flex h-11 w-11 cursor-pointer items-center justify-center text-muted hover:text-fg" onClick={() => onChange(clamp(value - step))} aria-label={`Giảm ${label}`}>
          <Minus size={18} aria-hidden="true" />
        </button>
        <input
          id={id}
          inputMode="decimal"
          className="num w-full min-w-0 bg-transparent text-center text-2xl font-semibold outline-none"
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value.replace(',', '.'));
            if (Number.isFinite(v)) onChange(clamp(v));
          }}
        />
        <button type="button" className="flex h-11 w-11 cursor-pointer items-center justify-center text-muted hover:text-fg" onClick={() => onChange(clamp(value + step))} aria-label={`Tăng ${label}`}>
          <PlusIcon size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Term({ value, label, result }: { value: string; label: string; result?: boolean }) {
  return (
    <span className="flex flex-col items-center">
      <span className={cn('num text-5xl font-bold leading-none sm:text-6xl', result && 'text-accent')}>{value}</span>
      <span className="mt-1 text-xs font-medium text-muted">{label}</span>
    </span>
  );
}

const Op = ({ children }: { children: string }) => <span className="num pb-5 text-4xl font-medium text-muted sm:text-5xl">{children}</span>;

/** Canonical corner-5 path: start → aim (L2) → S2 → arrival (L1), in diamonds. */
function corner5Path(def: SystemDefinition, start: number, aim: number, arrival: number) {
  const s = positionOf(def.numbering.start, start);
  const a = positionOf(def.numbering.aim, aim);
  const r = positionOf(def.numbering.arrival, arrival);
  if (!s || !a || !r) return null;
  const off = DIAMOND_OFFSET_D;
  const through = start >= 50;
  const sp: [number, number] = s.cushion === 'L1' ? [s.diamond, -off] : [-off, s.diamond];
  const ap: [number, number] = [a.diamond, 4 + (through ? off : 0)];
  const rp: [number, number] = [r.diamond, 0];
  // Reflect the arrival across x = 8 to find the S2 contact.
  const mx = 16 - rp[0];
  const t = (8 - ap[0]) / (mx - ap[0]);
  const s2: [number, number] = [8, ap[1] + t * (rp[1] - ap[1])];
  // Cue ball sits on the start→aim line, ~1.1 diamonds into the table.
  const dx = ap[0] - sp[0];
  const dy = ap[1] - sp[1];
  const len = Math.hypot(dx, dy);
  const k = Math.min(0.45, 1.1 / len + off / len);
  const cue: [number, number] = [sp[0] + dx * k, sp[1] + dy * k];
  return { sp, ap, rp, s2, cue };
}

function Corner5({ def, compact }: { def: SystemDefinition; compact?: boolean }) {
  const [mode, setMode] = useState<'aim' | 'arrival'>('aim');
  const [start, setStart] = useState(50);
  const [arrival, setArrival] = useState(20);
  const [aimIn, setAimIn] = useState(30);
  const [tips, setTips] = useState(def.base.spinTips);
  const corr = bo50Correction(start, def);
  const shift = bo50TipShift(tips, def.base.spinTips);
  const aim = mode === 'aim' ? start + corr - arrival + shift : aimIn;
  const arr = mode === 'arrival' ? start + corr - aimIn + shift : arrival;
  const path = corner5Path(def, start, Math.max(0, aim), Math.max(0, arr));
  const [lo, hi] = def.validStartRange;
  const outOfRange = start < lo || start > hi;
  const sign = corr >= 0 ? '+' : '−';

  const params = new URLSearchParams({ sys: def.id, start: String(start), aim: String(Math.round(aim * 10) / 10), tips: String(tips) });

  return (
    <div className="flex flex-col gap-5">
      <Segmented
        label="Tính giá trị nào"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'aim', label: 'Tính điểm ngắm' },
          { value: 'arrival', label: 'Tính điểm về' },
        ]}
      />
      <div className="grid grid-cols-3 gap-3">
        <Stepper label="Điểm đầu" value={start} onChange={setStart} min={0} max={110} />
        {mode === 'aim' ? (
          <Stepper label="Muốn về" value={arrival} onChange={setArrival} min={0} max={90} />
        ) : (
          <Stepper label="Điểm ngắm" value={aimIn} onChange={setAimIn} min={0} max={90} />
        )}
        <Stepper label="Ép phê (tip)" value={tips} onChange={setTips} min={0} max={4} step={0.5} />
      </div>

      <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-2 py-2" aria-live="polite">
        <Term value={numVi(start, 0)} label="Đầu" />
        <Op>{sign}</Op>
        <Term value={numVi(Math.abs(corr), 1)} label="Sai số" />
        <Op>−</Op>
        {mode === 'aim' ? <Term value={numVi(arrival, 0)} label="Về" /> : <Term value={numVi(aimIn, 0)} label="Ngắm" />}
        {shift !== 0 && (
          <>
            <Op>{shift > 0 ? '+' : '−'}</Op>
            <Term value={numVi(Math.abs(shift), 0)} label="Ép phê" />
          </>
        )}
        <Op>=</Op>
        <Term value={numVi(mode === 'aim' ? aim : arr, 1)} label={mode === 'aim' ? 'Ngắm' : 'Về'} result />
      </div>
      <p className="text-center text-sm text-muted">
        {start >= 50 ? 'Đầu từ 50 trở lên: ngắm xuyên băng vào nút.' : 'Đầu dưới 50: ngắm trước mặt nút (mũi băng).'} Lực trung bình, {numVi(tips)} tip ép phê thuận.
      </p>
      {outOfRange && <p className="rounded-lg bg-kiss/12 px-3 py-2 text-sm text-kiss">Điểm đầu nằm ngoài phạm vi {lo}–{hi} của bộ số — kết quả chỉ để tham khảo.</p>}

      {!compact && path && (
        <TableSvg title="Sơ đồ bộ 50" system={def} className="w-full">
          <polyline
            points={[path.cue, path.ap, path.s2, path.rp].map((p) => p.join(',')).join(' ')}
            fill="none"
            stroke="#fff"
            strokeWidth={0.045}
            strokeLinejoin="round"
          />
          <line x1={path.sp[0]} y1={path.sp[1]} x2={path.cue[0]} y2={path.cue[1]} stroke="#fff" strokeOpacity={0.45} strokeWidth={0.03} strokeDasharray="0.08 0.06" />
          <Ball x={path.cue[0]} y={path.cue[1]} color="var(--color-ball-white)" />
          <circle cx={path.rp[0]} cy={0.0866} r={0.0866} fill="none" stroke="var(--color-ball-yellow)" strokeWidth={0.03} />
        </TableSvg>
      )}
      <Link to={`/phong-tap?${params}`} className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-cloth px-4 font-semibold text-white hover:bg-cloth-deep">
        <Crosshair size={18} aria-hidden="true" /> Mô phỏng cú này trong phòng tập
      </Link>
    </div>
  );
}

function PlusCalc() {
  const [cue, setCue] = useState(40);
  const [arrival, setArrival] = useState(70);
  const aim = plusAim(cue, arrival);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Stepper label="Điểm bi cái" value={cue} onChange={setCue} min={0} max={100} />
        <Stepper label="Muốn về (băng 3)" value={arrival} onChange={setArrival} min={0} max={150} />
      </div>
      <div className="flex flex-wrap items-end justify-center gap-3 py-2" aria-live="polite">
        <Term value={numVi(arrival, 0)} label="Về" />
        <Op>−</Op>
        <Term value={numVi(cue, 0)} label="Bi cái" />
        <Op>=</Op>
        <Term value={numVi(aim, 0)} label="Băng 1" result />
      </div>
      {!plusValid(cue) && <p className="rounded-lg bg-kiss/12 px-3 py-2 text-sm text-kiss">Không nên dùng Plus khi điểm bi cái từ 0 đến 30.</p>}
      <p className="text-sm text-muted">Bảng đánh số Plus còn là bản nháp, chờ HLV cung cấp. Thượng 2 tip, rất nhạy với lực.</p>
    </div>
  );
}

function CupCalc() {
  const [owner, setOwner] = useState(2);
  const [carde, setCarde] = useState(1);
  const [target, setTarget] = useState(2);
  const ep = cupEnglishNeeded(owner, carde, target);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <Stepper label="Bi chủ" value={owner} onChange={setOwner} min={-6} max={8} step={0.5} />
        <Stepper label="Carde" value={carde} onChange={setCarde} min={-6} max={8} step={0.5} />
        <Stepper label="Muốn về" value={target} onChange={setTarget} min={-4} max={8} step={0.5} />
      </div>
      <div className="flex flex-wrap items-end justify-center gap-3 py-2" aria-live="polite">
        <Term value={numVi(target)} label="Về" />
        <Op>−</Op>
        <Term value={numVi(owner)} label="Bi chủ" />
        <Op>−</Op>
        <Term value={numVi(carde)} label="Carde" />
        <Op>=</Op>
        <Term value={numVi(ep)} label="Ép phê" result />
      </div>
      <p className="text-sm text-muted">
        Đơn vị: ½ nút = 1. Gốc: chạm trái ¼, không ép phê, bi chủ về thẳng góc dậu.{' '}
        {ep < 0 ? `Cần ép phê dằn (nghịch) ${numVi(-ep)}.` : ep > 0 ? `Cần ép phê thuận ${numVi(ep)}.` : 'Không cần ép phê.'}
      </p>
    </div>
  );
}

export function SystemCalculator({ id, compact }: { id: string; compact?: boolean }) {
  const def = findSystem(id);
  if (!def) return null;
  if (def.family === 'corner5_subtractive') return <Corner5 def={def} compact={compact} />;
  if (def.family === 'plus_additive') return <PlusCalc />;
  if (def.family === 'cup_additive') return <CupCalc />;
  return null;
}

/** MDX embed: a bordered calculator with a link to the full system page. */
export function SystemCalc({ id }: { id: string }) {
  const def = findSystem(id);
  if (!def) return null;
  return (
    <section className="not-prose my-8 rounded-2xl border border-line bg-surface p-4 sm:p-6" aria-label={`Máy tính ${def.names.vi}`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-bold">Máy tính {def.names.vi}</h3>
        <Link to={`/bo-so/${def.id}`} className="text-sm font-semibold text-accent">
          Xem bộ số
        </Link>
      </div>
      <SystemCalculator id={id} compact />
    </section>
  );
}
