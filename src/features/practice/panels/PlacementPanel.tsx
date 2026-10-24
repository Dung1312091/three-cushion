import { FolderOpen, Magnet, Redo2, RotateCcw, Save, Search, Share2, Shuffle, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { t } from '@/i18n/vi';
import { encodeLayout } from '@/lib/share';
import { usePractice } from '../store';

export function PlacementPanel() {
  const snap = usePractice((s) => s.snap);
  const solving = usePractice((s) => s.solving);
  const history = usePractice((s) => s.history.length);
  const future = usePractice((s) => s.future.length);
  const saved = usePractice((s) => s.saved);
  const st = usePractice.getState();
  const [name, setName] = useState('');

  const share = async () => {
    const s = usePractice.getState();
    const code = encodeLayout({ preset: s.table.preset, cue: s.cue, balls: s.balls, strike: s.tab === 'manual' ? s.manualStrike : undefined });
    const url = `${location.origin}/phong-tap?l=${code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Thế bi 3 băng', url });
      else {
        await navigator.clipboard.writeText(url);
        s.showToast(t.practice.copied);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Resetting the balls is the most frequent action here, so it comes first. */}
      <div className="flex gap-2">
        <Button className="flex-1 justify-center text-base" onClick={st.breakLayout}>
          <RotateCcw size={18} aria-hidden="true" /> {t.practice.reset}
        </Button>
        <Button size="icon" onClick={st.undo} disabled={history === 0} aria-label={t.practice.undo} title={t.practice.undo}>
          <Undo2 size={18} aria-hidden="true" />
        </Button>
        <Button size="icon" onClick={st.redo} disabled={future === 0} aria-label={t.practice.redo} title={t.practice.redo}>
          <Redo2 size={18} aria-hidden="true" />
        </Button>
      </div>

      <Button variant="primary" className="w-full justify-center text-base" onClick={() => void st.findShots()} disabled={solving}>
        <Search size={20} aria-hidden="true" /> {solving ? t.practice.searching : t.practice.findShots}
      </Button>
      <p className="-mt-3 text-sm text-muted">Kéo bi trên bàn để đặt đúng thế đang gặp. Chạm giữ để hiện kính lúp.</p>

      <div className="-mt-2 flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" checked={snap} onChange={(e) => st.setSnap(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
          <Magnet size={18} className="text-muted" aria-hidden="true" />
          <span>{t.practice.snap}</span>
        </label>
        <Button size="sm" variant="ghost" onClick={st.randomLayout}>
          <Shuffle size={18} aria-hidden="true" /> {t.practice.random}
        </Button>
      </div>

      <section aria-labelledby="save-layout" className="flex flex-col gap-2">
        <h3 id="save-layout" className="font-semibold">
          Lưu và chia sẻ
        </h3>
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="sr-only">Tên thế bi</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên thế bi, ví dụ: thế sườn bàn 3" className="h-11 w-full rounded-xl border border-line bg-bg px-3 outline-none focus:border-accent" />
          </label>
          <Button
            onClick={() => {
              void st.saveLayout(name.trim());
              setName('');
            }}
          >
            <Save size={18} aria-hidden="true" /> Lưu
          </Button>
          <Button size="icon" onClick={() => void share()} aria-label={t.practice.share}>
            <Share2 size={18} aria-hidden="true" />
          </Button>
        </div>
        {saved.length > 0 && (
          <ul className="mt-1 divide-y divide-line rounded-xl border border-line">
            {saved.slice(0, 12).map((l) => (
              <li key={l.id} className="flex items-center gap-2 pl-3">
                <button type="button" className="flex min-h-11 flex-1 cursor-pointer items-center gap-2 text-left" onClick={() => st.openLayout(l)}>
                  <FolderOpen size={16} className="shrink-0 text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  <span className="shrink-0 text-xs text-muted">{new Date(l.createdAt).toLocaleDateString('vi-VN')}</span>
                </button>
                <button type="button" className="flex h-11 w-11 cursor-pointer items-center justify-center text-muted hover:text-ball-red" onClick={() => void st.deleteLayout(l.id)} aria-label={`Xoá ${l.name}`}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
