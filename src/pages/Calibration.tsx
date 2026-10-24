import { Check, ChevronLeft, Play, Square, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { fit502030, fitRoll, type RollSample, type SystemFit } from '@/calibration/fit';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { findSystem } from '@/content/loader';
import { effectivePhysics, makeTable, PRESET_ORDER, type TableProfile } from '@/engine/table';
import { mediumSpeed } from '@/features/practice/practiceLoad';
import { usePractice } from '@/features/practice/store';
import { cn } from '@/lib/cn';
import { numVi } from '@/lib/format';
import { settings as settingsStore, tables as tablesStore, uid } from '@/lib/storage';

type Step = 'roll' | 'system' | 'manual' | 'result';
const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'roll', label: 'Thử lăn' },
  { id: 'system', label: 'Thử 50-30-20' },
  { id: 'manual', label: 'Chỉnh tay' },
  { id: 'result', label: 'Kết quả' },
];

function Stopwatch({ onDone }: { onDone: (s: number) => void }) {
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (start === null) return;
    const tick = () => {
      setNow(performance.now());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [start]);
  const elapsed = start === null ? 0 : (now - start) / 1000;
  return (
    <div className="flex items-center gap-3">
      <Button
        variant={start === null ? 'primary' : 'danger'}
        className="min-w-36 justify-center"
        onClick={() => {
          if (start === null) {
            setStart(performance.now());
            setNow(performance.now());
          } else {
            onDone((performance.now() - start) / 1000);
            setStart(null);
          }
        }}
      >
        {start === null ? <Play size={18} aria-hidden="true" /> : <Square size={18} aria-hidden="true" />}
        {start === null ? 'Bấm khi đánh' : 'Bấm khi bi dừng'}
      </Button>
      <span className="num text-3xl font-bold tabular-nums" aria-live="off">
        {numVi(elapsed, 1)} s
      </span>
    </div>
  );
}

export default function Calibration() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TableProfile | null>(null);
  const [all, setAll] = useState<TableProfile[]>([]);
  const [step, setStep] = useState<Step>('roll');
  const [roll, setRoll] = useState<RollSample[]>([]);
  const [stop, setStop] = useState(1);
  const [arrivals, setArrivals] = useState<number[]>([]);
  const [arr, setArr] = useState(20);
  const [busy, setBusy] = useState(false);
  const [rollFit, setRollFit] = useState<{ muRoll: number; rmsSeconds: number } | null>(null);
  const [sysFit, setSysFit] = useState<SystemFit | null>(null);
  const [manual, setManual] = useState<{ muRoll: number; eCushion: number; muCushion: number } | null>(null);
  const bo50 = findSystem('bo-50');

  useEffect(() => {
    void tablesStore.list().then((list) => {
      setAll(list);
      const id = params.get('table');
      const p = list.find((t) => t.id === id) ?? list[0] ?? makeTable('UMB_MATCH', { id: uid(), name: 'Bàn của tôi' });
      setProfile(p);
      const ph = effectivePhysics(p);
      setManual({ muRoll: ph.muRoll, eCushion: ph.eCushion, muCushion: ph.muCushion });
    });
  }, [params]);

  useEffect(() => {
    document.title = 'Hiệu chuẩn bàn — Ba Băng';
  }, []);

  if (!profile || !manual) return null;

  const run = (fn: () => void) => {
    setBusy(true);
    setTimeout(() => {
      try {
        fn();
      } finally {
        setBusy(false);
      }
    }, 30);
  };

  const fitRollNow = () =>
    run(() => {
      const r = fitRoll(profile, roll);
      setRollFit(r);
      setManual((m) => (m ? { ...m, muRoll: r.muRoll } : m));
    });

  const fitSystemNow = async () => {
    if (!bo50) return;
    const st = await settingsStore.get();
    run(() => {
      const base = { ...profile, physics: { ...effectivePhysics(profile), muRoll: manual.muRoll }, calibration: undefined };
      const r = fit502030(base, bo50, arrivals, st.tipUnitR, mediumSpeed(base));
      setSysFit(r);
      setManual((m) => (m ? { ...m, eCushion: r.eCushion, muCushion: r.muCushion } : m));
    });
  };

  const save = async () => {
    const steps: Array<'roll' | 'system-50-30-20' | 'manual'> = [];
    if (rollFit) steps.push('roll');
    if (sysFit) steps.push('system-50-30-20');
    steps.push('manual');
    const next: TableProfile = {
      ...profile,
      calibration: {
        steps,
        fitted: { muRoll: manual.muRoll, eCushion: manual.eCushion, muCushion: manual.muCushion },
        rmsDiamonds: sysFit?.rmsDiamonds ?? 0,
        samples: roll.length + arrivals.length,
        playsLongShortDiamonds: sysFit?.playsLongShortDiamonds ?? 0,
        fittedAt: new Date().toISOString(),
      },
    };
    await tablesStore.save(next);
    usePractice.setState({ savedTables: await tablesStore.list() });
    usePractice.getState().setTable(next);
    navigate('/phong-tap');
  };

  const longShort = sysFit?.playsLongShortDiamonds ?? 0;
  const ph = effectivePhysics(profile);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4">
      <Link to="/ban" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted hover:text-fg">
        <ChevronLeft size={18} aria-hidden="true" /> Bàn
      </Link>
      <h1 className="mt-1 text-2xl font-bold">Hiệu chuẩn bàn</h1>
      <p className="mt-2 text-muted">Mỗi bàn chạy khác nhau theo nỉ, băng và nhiệt độ. Vài cú thử giúp mô phỏng khớp bàn bạn đang đứng.</p>

      <label className="mt-5 block">
        <span className="text-sm font-medium text-muted">Bàn</span>
        <select
          className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-3 font-semibold"
          value={profile.id}
          onChange={(e) => {
            const p = all.find((x) => x.id === e.target.value) ?? makeTable(e.target.value as (typeof PRESET_ORDER)[number], { id: uid(), name: 'Bàn của tôi' });
            setProfile(p);
            const ph2 = effectivePhysics(p);
            setManual({ muRoll: ph2.muRoll, eCushion: ph2.eCushion, muCushion: ph2.muCushion });
          }}
        >
          {all.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          {!all.some((t) => t.id === profile.id) && <option value={profile.id}>{profile.name} (mới)</option>}
          {PRESET_ORDER.map((p) => (
            <option key={p} value={p}>
              Bàn mới theo mẫu {p}
            </option>
          ))}
        </select>
      </label>

      <ol className="mt-6 flex gap-1.5" aria-label="Các bước">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex-1">
            <button
              type="button"
              onClick={() => setStep(s.id)}
              aria-current={step === s.id ? 'step' : undefined}
              className={cn('flex w-full cursor-pointer flex-col items-start gap-1 border-t-4 pt-2 text-left text-sm font-medium', step === s.id ? 'border-accent text-fg' : 'border-line text-muted')}
            >
              <span className="num text-base">{i + 1}</span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      {step === 'roll' && (
        <section className="mt-6 flex flex-col gap-5">
          <div className="leading-relaxed">
            <p>Đặt bi giữa bàn, sát băng ngắn. Đánh dằn thẳng giữa tâm sang băng ngắn đối diện với lực vừa đủ để bi quay về gần băng xuất phát.</p>
            <p className="mt-2 text-muted">Bấm đồng hồ lúc đánh và lúc bi dừng, rồi kéo thanh trượt tới chỗ bi dừng. Làm 3 lần.</p>
          </div>
          <Stopwatch
            onDone={(s) => {
              setRoll((r) => [...r, { seconds: s, stopDiamonds: stop }]);
            }}
          />
          <Slider label="Bi dừng cách băng xuất phát" value={stop} min={0} max={8} step={0.1} format={(v) => `${numVi(v)} nút`} onChange={setStop} hint="Chỉnh trước khi bấm dừng đồng hồ, hoặc sửa lại cho lần đo cuối bên dưới." />
          {roll.length > 0 && (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {roll.map((r, i) => (
                <li key={i} className="flex min-h-11 items-center justify-between gap-3 px-3">
                  <span className="num text-lg">
                    Lần {i + 1}: {numVi(r.seconds, 1)} s, dừng ở {numVi(r.stopDiamonds)} nút
                  </span>
                  <button type="button" className="flex h-11 w-11 cursor-pointer items-center justify-center text-muted" onClick={() => setRoll((x) => x.filter((_, j) => j !== i))} aria-label={`Xoá lần ${i + 1}`}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" disabled={roll.length === 0 || busy} onClick={fitRollNow}>
              {busy ? 'Đang tính…' : 'Tính độ lăn của nỉ'}
            </Button>
            {rollFit && (
              <span className="flex items-center gap-1.5 text-score">
                <Check size={18} aria-hidden="true" /> μr = {numVi(rollFit.muRoll, 4)} (lệch {numVi(rollFit.rmsSeconds, 2)} s)
              </span>
            )}
          </div>
          <Button onClick={() => setStep('system')} className="self-start">
            Sang bước 2
          </Button>
        </section>
      )}

      {step === 'system' && (
        <section className="mt-6 flex flex-col gap-5">
          <div className="leading-relaxed">
            <p>Đặt bi cái ở điểm đầu 50 (góc), ngắm 30 xuyên nút, 2 tip ép phê thuận, lực trung bình. Đánh 3 đến 5 lần, ghi lại điểm về ở băng 3.</p>
            <p className="mt-2 text-muted">Về đúng 20 nghĩa là bàn khớp lượng ép phê chuẩn của bộ 50.</p>
          </div>
          <div className="flex items-end gap-3">
            <Slider className="flex-1" label="Điểm về thực tế" value={arr} min={0} max={60} step={1} onChange={setArr} />
            <Button onClick={() => setArrivals((a) => [...a, arr])}>Ghi lần {arrivals.length + 1}</Button>
          </div>
          {arrivals.length > 0 && (
            <p className="num text-xl">
              {arrivals.map((a, i) => (
                <button key={i} type="button" className="mr-2 cursor-pointer rounded-lg bg-surface-2 px-2 py-1" onClick={() => setArrivals((x) => x.filter((_, j) => j !== i))} aria-label={`Xoá giá trị ${a}`}>
                  {a} ×
                </button>
              ))}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" disabled={arrivals.length === 0 || busy || !bo50} onClick={() => void fitSystemNow()}>
              {busy ? 'Đang tính…' : 'Khớp băng với kết quả'}
            </Button>
            {sysFit && (
              <span className="text-score">
                Mô phỏng về {sysFit.simulatedFitted !== null ? numVi(sysFit.simulatedFitted, 0) : '—'} (trước: {sysFit.simulatedDefault !== null ? numVi(sysFit.simulatedDefault, 0) : '—'}), sai số {numVi(sysFit.rmsDiamonds, 2)} nút
              </span>
            )}
          </div>
          <Button onClick={() => setStep('manual')} className="self-start">
            Sang bước 3
          </Button>
        </section>
      )}

      {step === 'manual' && (
        <section className="mt-6 flex flex-col gap-5">
          <p className="text-muted">Dành cho người đã quen tham số. Giá trị đã khớp ở bước 1–2 được điền sẵn.</p>
          <Slider label="Độ lăn của nỉ μr" value={manual.muRoll} min={0.004} max={0.02} step={0.0005} format={(v) => numVi(v, 4)} onChange={(v) => setManual({ ...manual, muRoll: v })} />
          <Slider label="Độ nảy băng e" value={manual.eCushion} min={0.55} max={0.95} step={0.01} format={(v) => numVi(v, 2)} onChange={(v) => setManual({ ...manual, eCushion: v })} />
          <Slider label="Ma sát băng μw" value={manual.muCushion} min={0.05} max={0.3} step={0.005} format={(v) => numVi(v, 3)} onChange={(v) => setManual({ ...manual, muCushion: v })} />
          <Button onClick={() => setStep('result')} className="self-start">
            Xem kết quả
          </Button>
        </section>
      )}

      {step === 'result' && (
        <section className="mt-6 flex flex-col gap-5">
          <p className="text-2xl font-bold leading-snug">
            {Math.abs(longShort) < 0.15 ? 'Bàn này chạy gần chuẩn' : `Bàn này chạy ${longShort > 0 ? 'dài' : 'ngắn'} ${numVi(Math.abs(longShort))} nút so với chuẩn`}
            {manual.muRoll < 0.007 ? ', nỉ nhanh.' : manual.muRoll > 0.01 ? ', nỉ chậm.' : '.'}
          </p>
          <dl className="grid grid-cols-3 gap-3 rounded-xl border border-line bg-surface p-4">
            {(
              [
                ['μr', manual.muRoll, ph.muRoll, 4],
                ['e băng', manual.eCushion, ph.eCushion, 2],
                ['μw', manual.muCushion, ph.muCushion, 3],
              ] as const
            ).map(([k, v, d, n]) => (
              <div key={k}>
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="num text-2xl font-bold">{numVi(v, n)}</dd>
                <dd className="num text-xs text-muted">mặc định {numVi(d, n)}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted">Sau hiệu chuẩn, băng 1–2 thường khớp tốt; từ băng 3 trở đi chỉ nên tin ở mức vùng nút.</p>
          <Button variant="primary" onClick={() => void save()} className="self-start">
            <Check size={18} aria-hidden="true" /> Lưu và dùng trong phòng tập
          </Button>
        </section>
      )}
    </div>
  );
}
