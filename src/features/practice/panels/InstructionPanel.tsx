import { FlaskConical, RotateCcw, Square, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ambient } from '@/lib/ambient';
import { playClipSteps, preferredEngine, primeAudio, rememberEngine, stopClips } from '@/lib/clipPlayer';
import { canAutoSpeak, speakSteps, stopSpeaking, ttsSupported, vietnameseVoice } from '@/lib/speech';
import { spokenSteps } from '../spokenSteps';
import type { BallId, SimEvent } from '@/engine/types';
import { CUSHION_VI, STROKE_VI } from '@/solver/instruct';
import type { ShotOption } from '@/solver/types';
import { numVi } from '@/lib/format';
import { cn } from '@/lib/cn';
import { CUE_ANIM, usePractice } from '../store';
import { ElevationFigure, TipWidget } from './TipWidget';

const BALL_VI: Record<BallId, string> = { white: 'bi trắng', yellow: 'bi vàng', red: 'bi đỏ' };
const TTS = ttsSupported();

/**
 * The instruction as a spoken checklist: read aloud automatically when an option opens
 * (if enabled), with the current step highlighted so the player can glance and follow.
 */
function VoiceGuide({ option }: { option: ShotOption }) {
  const autoSpeak = usePractice((s) => s.settings.autoSpeak);
  const saveSettings = usePractice((s) => s.saveSettings);
  const steps = useMemo(() => spokenSteps(option), [option]);
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

export function InstructionPanel({ option }: { option: ShotOption }) {
  const tipUnitR = usePractice((s) => s.settings.tipUnitR);
  const limit = usePractice((s) => s.table.physics.miscueLimit);
  const { tryVariant, playShot } = usePractice.getState();
  const ins = option.instruction;
  const aimText = ins.aim.thickness
    ? `Chạm ${ins.aim.thickness.side} ${ins.aim.thickness.label} ${BALL_VI[option.firstObject]}`
    : ins.aim.railPoint
      ? `${CUSHION_VI[ins.aim.railPoint.cushion]}, nút ${numVi(ins.aim.railPoint.diamond)} (${ins.aim.railPoint.throughDiamond ? 'xuyên nút' : 'trước mặt nút'})`
      : 'Theo đường ngắm';
  return (
    <div className="flex flex-col gap-4 pt-2">
      <VoiceGuide option={option} />
      <div className="flex flex-wrap items-start justify-around gap-4 rounded-xl bg-bg p-3">
        <TipWidget a={ins.tip.a} b={ins.tip.b} tipUnitR={tipUnitR} limit={limit} size={132} />
        <ElevationFigure deg={ins.elevationDeg} />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[0.9375rem]">
        <div className="col-span-2">
          <dt className="text-sm text-muted">Hướng ngắm</dt>
          <dd className="font-semibold">
            {aimText}
            {ins.aim.systemNumber && <span className="num ml-2 text-accent">bộ số {ins.aim.systemNumber.value}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Lực</dt>
          <dd className="font-semibold">
            <span className="num text-xl">{ins.speed.level}/10</span> <span className="text-sm font-normal text-muted">{numVi(ins.speed.V0)} m/s đầu cơ</span>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Kiểu đánh</dt>
          <dd className="font-semibold">
            {STROKE_VI[ins.stroke]}, ép phê {ins.english}
          </dd>
        </div>
        {option.system && (
          <div className="col-span-2">
            <dt className="text-sm text-muted">Bộ số</dt>
            <dd className="num text-lg font-semibold">{option.system.text}</dd>
          </div>
        )}
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
