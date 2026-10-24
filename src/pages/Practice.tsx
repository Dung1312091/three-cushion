import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { t } from '@/i18n/vi';
import { loadFromParams } from '@/features/practice/practiceLoad';
import { Loupe } from '@/features/practice/panels/Loupe';
import { BottomSheet, SidePanel } from '@/features/practice/panels/PracticeSheet';
import { PracticeTopBar } from '@/features/practice/panels/PracticeTopBar';
import { Scene3D } from '@/features/practice/scene/Scene3D';
import { usePractice } from '@/features/practice/store';

function useWide(): boolean {
  const q = '(min-width: 900px), (orientation: landscape) and (min-width: 640px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

/** /phong-tap — client-only practice room with the 3D table (§13). */
export default function Practice() {
  const wide = useWide();
  const [params, setParams] = useSearchParams();
  const toast = usePractice((s) => s.toast);
  const camera = usePractice((s) => s.camera);

  useEffect(() => {
    document.title = `${t.practice.title} — Ba Băng`;
    void usePractice.getState().init();
    return () => {
      document.title = 'Ba Băng';
    };
  }, []);

  useEffect(() => {
    if (![...params.keys()].length) return;
    const s = usePractice.getState();
    const load = loadFromParams(params, s.settings.tipUnitR);
    if (load) {
      if (load.table) s.setTable(load.table);
      if (load.cue !== s.cue) s.setCue(load.cue);
      s.setLayout(load.balls);
      if (load.strike) {
        usePractice.setState({ tab: 'manual', manualStrike: load.strike });
        void s.strikeManual();
      }
      if (load.title) s.showToast(load.title);
    }
    setParams({}, { replace: true });
  }, [params, setParams]);

  return (
    <div className="room fixed inset-0 overflow-hidden bg-bg text-fg">
      {/* No text selection / iOS callout on the table while dragging balls. */}
      <div className="absolute inset-0 touch-none select-none [-webkit-touch-callout:none] [-webkit-user-select:none]">
        <Scene3D />
      </div>
      <PracticeTopBar />
      {wide ? <SidePanel /> : <BottomSheet />}
      <Loupe />
      {camera === 'shooter' && !wide && (
        <p className="pointer-events-none absolute inset-x-0 top-16 z-20 mx-auto w-fit rounded-full bg-ink-2/85 px-3 py-1.5 text-xs text-white/85 portrait:block landscape:hidden">{t.practice.rotateHint}</p>
      )}
      {toast && (
        <div role="status" className="absolute left-1/2 top-16 z-40 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
