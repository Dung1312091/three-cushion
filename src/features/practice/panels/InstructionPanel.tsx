import { FlaskConical, RotateCcw, Square, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ambient } from '@/lib/ambient';
import { playClipSteps, preferredEngine, primeAudio, rememberEngine, stopClips } from '@/lib/clipPlayer';
import { canAutoSpeak, speakSteps, stopSpeaking, ttsSupported, vietnameseVoice } from '@/lib/speech';
import { spokenSteps } from '../spokenSteps';
import type { BallId, SimEvent } from '@/engine/types';
import { CUSHION_VI } from '@/solver/instruct';
import type { BallContact, HumanInstruction, ShotOption } from '@/solver/types';
import { numVi } from '@/lib/format';
import { cn } from '@/lib/cn';
import { CUE_ANIM, usePractice } from '../store';
import { afterContactLines, aimPointText, BALL_VI, bridgeOf, cueAngleOf, deliveryOf, spinOf, THICKNESS, thicknessName } from '../vocab';
import { ThicknessFigure } from './ThicknessFigure';
import { ElevationFigure, TipWidget } from './TipWidget';

const TTS = ttsSupported();
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The instruction as a spoken checklist: read aloud automatically when an option opens
 * (if enabled), with the current step highlighted so the player can glance and follow.
 */
function VoiceGuide({ option }: { option: ShotOption }) {
  const autoSpeak = usePractice((s) => s.settings.autoSpeak);
  const saveSettings = usePractice((s) => s.saveSettings);
  const tipUnitR = usePractice((s) => s.settings.tipUnitR);
  const steps = useMemo(() => spokenSteps(option, tipUnitR), [option, tipUnitR]);
  const [active, setActive] = useState(-1);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playClips = useCallback(() => {
    void playClipSteps(
      steps.map((s) => s.clips),
      {
        onStep: (i) => {
          setError(null);
          setSpeaking(true);
          setActive(i);
        },
        onDone: () => {
          setSpeaking(false);
          setActive(-1);
        },
        onError: (code) => {
          setSpeaking(false);
          setActive(-1);
          setError(code);
        },
      },
    );
  }, [steps]);

  /**
   * Browser speech first (more natural) when it has a Vietnamese voice; if it is stuck,
   * fails or has no such voice, switch to the recorded clips and remember that per device.
   */
  const play = useCallback(() => {
    primeAudio(); // unlock Web Audio inside the gesture so a later fallback can still play
    const useSpeech = TTS && preferredEngine() === 'speech' && !!vietnameseVoice(window.speechSynthesis.getVoices());
    if (!useSpeech) {
      playClips();
      return;
    }
    speakSteps(
      steps.map((s) => s.speech),
      {
        onStep: (i) => {
          setError(null);
          setSpeaking(true);
          setActive(i);
        },
        onDone: () => {
          setSpeaking(false);
          setActive(-1);
        },
        onError: (code) => {
          if (code === 'not-allowed') {
            setSpeaking(false);
            setActive(-1);
            setError(code);
            return;
          }
          console.info('[voice] speech engine unavailable (%s), using recorded clips', code);
          rememberEngine('clips');
          playClips();
        },
      },
    );
  }, [steps, playClips]);

  const stop = () => {
    stopSpeaking();
    stopClips();
    setSpeaking(false);
    setActive(-1);
  };

  const onPlayClick = () => {
    setError(null);
    play();
  };

  useEffect(() => {
    // Without a prior user gesture browsers refuse audio (and Chrome's speech queue can get stuck).
    if (canAutoSpeak() && usePractice.getState().settings.autoSpeak) play();
    return () => {
      stopSpeaking();
      stopClips();
    };
  }, [play]);

  // Keep the background music under the voice.
  useEffect(() => {
    ambient.duck(speaking);
    return () => ambient.duck(false);
  }, [speaking]);

  return (
    <section className="rounded-xl bg-bg p-3" aria-label="Hướng dẫn từng bước">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant={speaking ? 'secondary' : 'primary'} onClick={speaking ? stop : onPlayClick}>
          {speaking ? <Square size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
          {speaking ? 'Dừng đọc' : 'Nghe hướng dẫn'}
        </Button>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={autoSpeak} onChange={(e) => void saveSettings({ autoSpeak: e.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />
          Tự đọc khi chọn cú
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-kiss/12 px-3 py-2 text-sm text-kiss">
          {error === 'clips-missing'
            ? 'Không tải được file âm thanh hướng dẫn. Kiểm tra kết nối rồi thử lại.'
            : error === 'not-allowed'
            ? 'Trình duyệt chưa cho phát tiếng. Bấm “Nghe hướng dẫn” thêm một lần nữa.'
            : error === 'no-start'
              ? 'Bộ đọc giọng nói của trình duyệt đang bị treo. Đóng các tab khác đang đọc, hoặc thoát hẳn trình duyệt (Cmd+Q) rồi mở lại. Safari cũng dùng được.'
              : 'Không phát được tiếng.'}{' '}
          <span className="num text-xs opacity-80">(mã lỗi: {error})</span>
        </p>
      )}
      <ol className="mt-2 flex flex-col gap-1">
        {steps.map((s, i) => (
          <li
            key={s.label}
            aria-current={active === i ? 'step' : undefined}
            className={cn(
              'flex gap-3 rounded-lg border-l-4 px-3 py-2 transition-colors',
              active === i ? 'border-accent bg-accent/15' : 'border-transparent',
            )}
          >
            <span className="num w-5 shrink-0 text-lg font-semibold text-muted">{i + 1}</span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-muted">{s.label}</span>
              <span className="block text-[1.0625rem] font-medium leading-snug">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function diamondOf(e: Extract<SimEvent, { type: 'ball-cushion' }>, L: number): number {
  const D = L / 8;
  return e.cushion === 'L1' || e.cushion === 'L2' ? e.pos[0] / D : e.pos[1] / D;
}

/** "Chạm băng 1 (L2, nút 3,2) → … → chạm bi vàng ✓" — each item seeks playback (§13.5). */
export function EventTimeline() {
  const current = usePractice((s) => s.current);
  const cue = usePractice((s) => s.cue);
  const L = usePractice((s) => s.table.L);
  const seek = usePractice((s) => s.seek);
  if (!current) return null;
  const { rules, events } = current.result;
  const kissT = new Map(rules.kisses.map((k) => [k.t, k]));
  const items: Array<{ t: number; text: string; tone?: 'ok' | 'warn' }> = [];
  let rail = 0;
  for (const e of events) {
    if (rules.tSecond !== undefined && e.t > rules.tSecond + 1e-9) break;
    if (e.type === 'ball-cushion' && e.ball === cue) {
      rail++;
      items.push({ t: e.t, text: `Băng ${rail} (${CUSHION_VI[e.cushion]}, nút ${numVi(diamondOf(e, L))})` });
    } else if (e.type === 'ball-ball') {
      const k = kissT.get(e.t);
      if (k) {
        items.push({ t: e.t, text: `Đá bi: ${BALL_VI[e.a]} – ${BALL_VI[e.b]}${k.effect === 'kiss-out' ? ' (làm hỏng)' : k.effect === 'lucky' ? ' (nhờ đá mới ăn)' : ''}`, tone: 'warn' });
      } else if (e.a === cue || e.b === cue) {
        const other = e.a === cue ? e.b : e.a;
        const second = other === rules.secondObject;
        items.push({ t: e.t, text: `Chạm ${BALL_VI[other]}${second ? (rules.scored ? ' — ghi điểm' : ' — chưa đủ 3 băng') : ''}`, tone: second ? (rules.scored ? 'ok' : 'warn') : undefined });
      }
    }
  }
  if (!rules.secondObject) items.push({ t: current.result.tEnd, text: 'Bi cái dừng — không chạm đủ hai bi', tone: 'warn' });
  return (
    <ol className="flex flex-col gap-1" aria-label="Dòng thời gian sự kiện">
      {items.map((it, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => seek(Math.max(-CUE_ANIM, it.t - 0.05))}
            className={cn(
              'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-left hover:bg-surface-2',
              it.tone === 'ok' && 'text-score',
              it.tone === 'warn' && 'text-kiss',
            )}
          >
            <span className="num w-10 shrink-0 text-sm text-muted">{numVi(it.t, 2)}s</span>
            <span className="font-medium">{it.text}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** One of the three things a player sets at the table: object-ball contact, cue-ball contact, cue. */
export function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-bg p-3" aria-label={title}>
      <h4 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-muted">
        <span className="num flex h-6 w-6 items-center justify-center rounded-full bg-cloth text-xs font-bold text-white">{step}</span>
        {title}
      </h4>
      {children}
    </section>
  );
}

export function Notes({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <ul className={cn('mt-1.5 flex flex-col gap-1 text-sm leading-snug text-muted', className)}>
      {lines.map((l) => (
        <li key={l} className="flex gap-1.5">
          <span aria-hidden="true">•</span>
          <span>{l}</span>
        </li>
      ))}
    </ul>
  );
}

export function Field({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="font-semibold leading-snug">{value}</dd>
      {note && <dd className="text-sm leading-snug text-muted">{note}</dd>}
    </div>
  );
}

/** "1/2 trái vào bên trái bi đỏ" + where the cue-ball centre points + what the simulation saw afterwards. */
export function BallAim({ contact: c, cue }: { contact: BallContact; cue: BallId }) {
  const th = thicknessName(c.fraction, c.label);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <ThicknessFigure fraction={c.fraction} side={c.side} object={c.object} cue={cue} width={136} />
        <div className="min-w-44 flex-1">
          <p className="text-lg font-semibold leading-snug">
            {th.name}
            {th.key === 'full' ? ' vào' : `, chạm bên ${c.side}`} {BALL_VI[c.object]}
            {th.exact && <span className="num ml-1.5 text-sm font-normal text-muted">(≈ {th.exact})</span>}
          </p>
          <p className="text-[0.9375rem] leading-snug">{aimPointText(c.fraction, c.side, c.object)}</p>
          <Notes lines={[THICKNESS[th.key].note]} />
        </div>
      </div>
      <div className="rounded-lg border border-line px-3 py-2">
        <p className="text-xs font-semibold text-muted">Sau va chạm (mô phỏng)</p>
        <Notes lines={afterContactLines(c)} className="mt-0.5 text-fg" />
      </div>
    </div>
  );
}

/** The cue-ball face plus the club name of the contact and what it does. */
export function CueBallContact({ a, b, english, ballFirst }: { a: number; b: number; english?: HumanInstruction['english']; ballFirst: boolean }) {
  const tipUnitR = usePractice((s) => s.settings.tipUnitR);
  const limit = usePractice((s) => s.table.physics.miscueLimit);
  const spin = spinOf(a, b, tipUnitR, english, ballFirst);
  return (
    <div className="flex flex-wrap items-start gap-4">
      <TipWidget a={a} b={b} tipUnitR={tipUnitR} limit={limit} size={112} caption={false} />
      <div className="min-w-40 flex-1">
        <p className="text-lg font-semibold leading-snug">{spin.name}</p>
        <p className="num text-[0.9375rem] font-medium text-accent">{spin.where}</p>
        <Notes lines={spin.effects} />
      </div>
    </div>
  );
}

export function InstructionPanel({ option }: { option: ShotOption }) {
  const tipUnitR = usePractice((s) => s.settings.tipUnitR);
  const cue = usePractice((s) => s.cue);
  const { tryVariant, playShot } = usePractice.getState();
  const ins = option.instruction;
  const ballFirst = option.family.firstContact === 'ball';
  const contact = ins.aim.contact;
  const spin = spinOf(ins.tip.a, ins.tip.b, tipUnitR, ins.english, ballFirst);
  const angle = cueAngleOf(ins.elevationDeg);
  const bridge = bridgeOf(ins.speed.level, ins.stroke, spin.vertical);
  const delivery = deliveryOf(ins.stroke, spin, option.kissRisk);
  const rail = ins.aim.railPoint;
  return (
    <div className="flex flex-col gap-3 pt-2">
      <VoiceGuide option={option} />
      <Section step={1} title={ballFirst ? 'Bi mục tiêu' : 'Ngắm băng'}>
        {ballFirst && contact ? (
          <BallAim contact={contact} cue={cue} />
        ) : (
          <div>
            <p className="text-lg font-semibold leading-snug">
              {rail ? `${capitalize(CUSHION_VI[rail.cushion])}, nút ${numVi(rail.diamond)}` : 'Theo đường ngắm trên bàn'}
              {ins.aim.systemNumber && <span className="num ml-2 text-accent">bộ số {ins.aim.systemNumber.value}</span>}
            </p>
            {rail && <p className="text-[0.9375rem]">Ngắm tâm bi cái {rail.throughDiamond ? 'xuyên qua nút (nút trên thành băng)' : 'vào điểm trên mũi băng ngay trước mặt nút'}.</p>}
            {option.system && <p className="num mt-1 font-semibold">{option.system.text}</p>}
            {contact && (
              <Notes
                lines={[`Sau ${contact.railsBefore} băng, bi cái chạm ${thicknessName(contact.fraction, contact.label).name.toLowerCase()} ${BALL_VI[contact.object]}.`]}
              />
            )}
          </div>
        )}
      </Section>
      <Section step={2} title="Bi cái — điểm chạm">
        <CueBallContact a={ins.tip.a} b={ins.tip.b} english={ins.english} ballFirst={ballFirst} />
      </Section>
      <Section step={3} title="Cơ & ra cơ">
        <div className="flex flex-wrap items-start gap-3">
          <ElevationFigure deg={ins.elevationDeg} />
          <dl className="grid min-w-48 flex-1 gap-2 text-[0.9375rem]">
            <Field label="Góc cơ" value={angle.text} note={angle.note} />
            <Field label="Cầu tay" value={bridge.name} note={bridge.why} />
            <Field label="Ra cơ" value={delivery.name} note={delivery.why} />
            <Field
              label="Lực"
              value={<span className="num">{ins.speed.level}/10</span>}
              note={`Bi đi khoảng ${ins.speed.level} chiều dài bàn · ${numVi(ins.speed.V0)} m/s ở đầu cơ`}
            />
          </dl>
        </div>
      </Section>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-1 text-[0.9375rem]">
        <div className="col-span-2">
          <dt className="text-sm text-muted">Dung sai hướng</dt>
          <dd className="num font-semibold">
            {numVi(option.tolerance.phiDeg[0], 2)}° … +{numVi(option.tolerance.phiDeg[1], 2)}°, lực {numVi(option.tolerance.speedPct[0], 0)}% … +{numVi(option.tolerance.speedPct[1], 0)}%
          </dd>
        </div>
      </dl>
      <EventTimeline />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void playShot(option.strike, 'option', option.id)}>
          <RotateCcw size={18} aria-hidden="true" /> Phát lại
        </Button>
        <Button onClick={() => tryVariant(option)}>
          <FlaskConical size={18} aria-hidden="true" /> Thử biến thể
        </Button>
      </div>
    </div>
  );
}
