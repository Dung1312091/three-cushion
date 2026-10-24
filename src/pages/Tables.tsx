import { Crosshair, Gauge, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Chip';
import { Segmented } from '@/components/ui/Segmented';
import { Slider } from '@/components/ui/Slider';
import { PRESET_ORDER, PRESETS, effectivePhysics, makeTable, physicsForCloth, type ClothState, type TableProfile } from '@/engine/table';
import { usePractice } from '@/features/practice/store';
import { numVi } from '@/lib/format';
import { DEFAULT_SETTINGS, settings as settingsStore, tables as tablesStore, uid, type Settings } from '@/lib/storage';

const CLOTH: Record<ClothState, string> = { new_fast: 'Nỉ mới, nhanh', normal: 'Bình thường', worn: 'Nỉ cũ' };
const PRESET_NAME: Record<string, string> = {
  UMB_MATCH: 'Bàn thi đấu 2840 × 1420',
  MID_2540: 'Bàn trung 2540 × 1270',
  KR_DOMESTIC_MID: 'Hàn nội địa 2448 × 1224',
  HALF_MATCH: 'Half-match 2300 × 1150',
  SMALL: 'Bàn nhỏ 2100 × 1050',
};
const SWATCHES = ['#1D5BB8', '#2A6E3F', '#5B6F82', '#7A2E3A'];

export default function Tables() {
  const navigate = useNavigate();
  const [list, setList] = useState<TableProfile[]>([]);
  const [draft, setDraft] = useState({ name: '', preset: 'UMB_MATCH' as (typeof PRESET_ORDER)[number], cloth: 'normal' as ClothState, heated: true, L: 2840, W: 1420 });
  const [st, setSt] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    document.title = 'Bàn — Ba Băng';
    void tablesStore.list().then(setList);
    void settingsStore.get().then(setSt);
  }, []);

  const refresh = async () => {
    const l = await tablesStore.list();
    setList(l);
    usePractice.setState({ savedTables: l });
  };

  const create = async () => {
    const base = makeTable(draft.preset, { id: uid(), name: draft.name || PRESET_NAME[draft.preset], cloth: draft.cloth, heated: draft.heated });
    const custom = Math.round(base.L * 1000) !== draft.L || Math.round(base.W * 1000) !== draft.W;
    const t: TableProfile = custom ? { ...base, preset: 'CUSTOM', L: draft.L / 1000, W: draft.W / 1000 } : base;
    await tablesStore.save(t);
    setDraft({ ...draft, name: '' });
    await refresh();
  };

  const saveSettings = async (p: Partial<Settings>) => {
    const next = { ...st, ...p };
    setSt(next);
    await settingsStore.save(next);
    usePractice.setState({ settings: next });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-5">
      <h1 className="text-2xl font-bold">Bàn và cài đặt</h1>
      <p className="mt-2 max-w-[60ch] text-muted">Lưu từng bàn bạn hay chơi. Hiệu chuẩn mỗi bàn một lần để mô phỏng gần với bàn thật.</p>

      <section className="mt-6" aria-labelledby="my-tables">
        <h2 id="my-tables" className="text-lg font-bold">
          Bàn của tôi
        </h2>
        {list.length === 0 && <p className="mt-2 text-muted">Chưa có bàn nào. Tạo bàn đầu tiên ở dưới.</p>}
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {list.map((t) => {
            const p = effectivePhysics(t);
            return (
              <li key={t.id} className="py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold">{t.name}</span>
                  <span className="num text-muted">
                    {Math.round(t.L * 1000)} × {Math.round(t.W * 1000)} mm
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Pill>{CLOTH[t.cloth]}</Pill>
                  <Pill>{t.heated ? 'Có sưởi' : 'Không sưởi'}</Pill>
                  {t.calibration ? (
                    <Pill tone="ok">
                      Đã hiệu chuẩn {new Date(t.calibration.fittedAt).toLocaleDateString('vi-VN')}
                      {Math.abs(t.calibration.playsLongShortDiamonds) >= 0.15 && `, chạy ${t.calibration.playsLongShortDiamonds > 0 ? 'dài' : 'ngắn'} ${numVi(Math.abs(t.calibration.playsLongShortDiamonds))} nút`}
                    </Pill>
                  ) : (
                    <Pill tone="warn">Chưa hiệu chuẩn</Pill>
                  )}
                </div>
                <p className="num mt-1.5 text-sm text-muted">
                  μr {numVi(p.muRoll, 4)}, μs {numVi(p.muSlide, 2)}, e băng {numVi(p.eCushion, 2)}, μw {numVi(p.muCushion, 3)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      usePractice.getState().setTable(t);
                      navigate('/phong-tap');
                    }}
                  >
                    <Crosshair size={16} aria-hidden="true" /> Dùng trong phòng tập
                  </Button>
                  <Link to={`/phong-tap/hieu-chuan?table=${t.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold hover:bg-surface-2">
                    <Gauge size={16} aria-hidden="true" /> Hiệu chuẩn
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await tablesStore.remove(t.id);
                      await refresh();
                    }}
                    aria-label={`Xoá ${t.name}`}
                  >
                    <Trash2 size={16} aria-hidden="true" /> Xoá
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-4" aria-labelledby="new-table">
        <h2 id="new-table" className="text-lg font-bold">
          Thêm bàn
        </h2>
        <div className="mt-3 flex flex-col gap-4">
          <label>
            <span className="text-sm font-medium text-muted">Tên bàn</span>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Bàn số 3, CLB …" className="mt-1 h-11 w-full rounded-xl border border-line bg-bg px-3 outline-none focus:border-accent" />
          </label>
          <label>
            <span className="text-sm font-medium text-muted">Kích thước lòng bàn</span>
            <select
              value={draft.preset}
              onChange={(e) => {
                const p = e.target.value as (typeof PRESET_ORDER)[number];
                setDraft({ ...draft, preset: p, L: Math.round(PRESETS[p].L * 1000), W: Math.round(PRESETS[p].W * 1000) });
              }}
              className="mt-1 h-11 w-full rounded-xl border border-line bg-bg px-3"
            >
              {PRESET_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRESET_NAME[p]}
                  {PRESETS[p].unverified ? ` (chưa kiểm chứng: ${PRESETS[p].unverified})` : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['L', 'W'] as const).map((k) => (
              <label key={k}>
                <span className="text-sm font-medium text-muted">{k === 'L' ? 'Dài (mm)' : 'Rộng (mm)'}</span>
                <input inputMode="numeric" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) || 0 })} className="num mt-1 h-11 w-full rounded-xl border border-line bg-bg px-3 text-lg" />
              </label>
            ))}
          </div>
          {draft.L !== draft.W * 2 && <p className="text-sm text-kiss">Bàn carom thường có tỉ lệ 2:1; nút sẽ tính theo chiều dài.</p>}
          <Segmented label="Tình trạng nỉ" value={draft.cloth} onChange={(v) => setDraft({ ...draft, cloth: v })} options={(Object.keys(CLOTH) as ClothState[]).map((c) => ({ value: c, label: CLOTH[c] }))} />
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={draft.heated} onChange={(e) => setDraft({ ...draft, heated: e.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />
            Bàn có sưởi
          </label>
          <p className="num text-sm text-muted">
            Tham số ban đầu: μs {numVi(physicsForCloth(draft.cloth, draft.heated).muSlide, 2)}, μr {numVi(physicsForCloth(draft.cloth, draft.heated).muRoll, 3)}, e băng {numVi(physicsForCloth(draft.cloth, draft.heated).eCushion, 2)}
          </p>
          <Button variant="primary" onClick={() => void create()} className="self-start">
            <Plus size={18} aria-hidden="true" /> Thêm bàn
          </Button>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="settings">
        <h2 id="settings" className="text-lg font-bold">
          Cài đặt
        </h2>
        <div className="mt-3 flex flex-col gap-5">
          <Slider
            label="1 tip bằng bao nhiêu bán kính bi"
            value={st.tipUnitR}
            min={0.08}
            max={0.2}
            step={0.01}
            format={(v) => `${numVi(v, 2)} R`}
            onChange={(v) => void saveSettings({ tipUnitR: v })}
            hint="Mặc định 0,15 R: 3 tip sát giới hạn trượt cơ. Chờ HLV duyệt."
          />
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Màu nỉ trong phòng tập</p>
            <div className="flex gap-3">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => void saveSettings({ clothColor: c })}
                  aria-label={`Màu nỉ ${c}`}
                  aria-pressed={st.clothColor === c}
                  className="h-11 w-11 cursor-pointer rounded-full ring-offset-2 ring-offset-bg aria-pressed:ring-2 aria-pressed:ring-accent"
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <Segmented
            label="Thang bộ số"
            value={String(st.systemScale) as '10' | '1'}
            onChange={(v) => void saveSettings({ systemScale: Number(v) as 10 | 1 })}
            options={[
              { value: '10', label: 'Thang ×10 (góc = 50)' },
              { value: '1', label: 'Corner-5 ×1' },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
