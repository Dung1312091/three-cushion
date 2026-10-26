import { create } from 'zustand';
import { glossary, systems } from '@/content/loader';
import type { BakedShot } from '@/engine/bake';
import { ENGINE_VERSION } from '@/engine/params';
import { restingBalls, type SimResult } from '@/engine/simulate';
import { breakPositions, makeTable, type TableProfile, type TablePreset } from '@/engine/table';
import type { BallId, CueStrike, Segment } from '@/engine/types';
import { diversify, rankScore } from '@/solver/solve';
import type { ShotOption, SkillLevel, SolveStats } from '@/solver/types';
import { DEFAULT_SETTINGS, layouts, settings as settingsStore, tables as tablesStore, uid, type SavedLayout, type Settings } from '@/lib/storage';
import { getPool } from '@/workers/pool';
import type { Analysis, Prediction } from '@/workers/sim.worker';

export type Layout = Record<BallId, { x: number; y: number }>;
export type Tab = 'place' | 'suggest' | 'manual';
export type SheetSnap = 'collapsed' | 'half' | 'full';
export type SortKey = 'score' | 'easy' | 'safe' | 'leave';
export type CameraMode = 'top' | 'shooter' | 'free';

export interface CurrentShot {
  strike: CueStrike;
  result: SimResult;
  baked: BakedShot;
  tracks: Record<BallId, Float32Array>;
  segs: Record<BallId, Segment[]>;
  source: 'option' | 'manual';
  optionId?: string;
}

/** Cue animation lead-in before t = 0 (pull back 0.6 s, push 0.15 s — §13.2). */
export const CUE_ANIM = 0.75;
/** Playback time lives outside React; components read it in useFrame / rAF (§13.8). */
export const playClock = { t: -CUE_ANIM };
/** Set by the Canvas so DOM controls can request a frame in demand mode. */
export const sceneApi = { invalidate: () => {} };

const MAX_HISTORY = 50;
const cache = new Map<string, ShotOption[]>();

interface PracticeState {
  table: TableProfile;
  savedTables: TableProfile[];
  cue: BallId;
  balls: Layout;
  history: Layout[];
  future: Layout[];
  tab: Tab;
  skill: SkillLevel;
  sort: SortKey;
  options: ShotOption[];
  selectedId?: string;
  solving: boolean;
  solveEpoch: number;
  solveStats?: SolveStats | null;
  manualStrike: CueStrike;
  prediction?: Prediction;
  analysis?: Analysis | 'loading';
  current?: CurrentShot;
  playback: { playing: boolean; speed: 0.25 | 0.5 | 1; loop: boolean };
  camera: CameraMode;
  layers: { trails: boolean; cue: boolean; systemOverlay: boolean };
  snap: boolean;
  sheet: SheetSnap;
  insets: { top: number; bottom: number; right: number };
  drag?: { id: BallId; clientX: number; clientY: number; touch: boolean };
  settings: Settings;
  saved: SavedLayout[];
  toast?: string;
}

interface PracticeActions {
  init: () => Promise<void>;
  setTable: (t: TableProfile) => void;
  setPreset: (p: Exclude<TablePreset, 'CUSTOM'>) => void;
  setCue: (c: BallId) => void;
  beginDrag: (id: BallId) => void;
  moveBall: (id: BallId, x: number, y: number) => void;
  setDrag: (d: PracticeState['drag']) => void;
  setLayout: (l: Layout, push?: boolean) => void;
  undo: () => void;
  redo: () => void;
  breakLayout: () => void;
  randomLayout: () => void;
  setTab: (t: Tab) => void;
  setSkill: (s: SkillLevel) => void;
  setSort: (s: SortKey) => void;
  findShots: () => Promise<void>;
  selectOption: (id: string) => Promise<void>;
  closeOption: () => void;
  setManual: (p: Partial<CueStrike>) => void;
  strikeManual: () => Promise<void>;
  tryVariant: (o: ShotOption) => void;
  analyzeManual: () => Promise<void>;
  playShot: (strike: CueStrike, source: CurrentShot['source'], optionId?: string) => Promise<void>;
  continueFromShot: () => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: PracticeState['playback']['speed']) => void;
  setLoop: (l: boolean) => void;
  seek: (t: number) => void;
  setCamera: (c: CameraMode) => void;
  toggleLayer: (k: keyof PracticeState['layers']) => void;
  setSnap: (s: boolean) => void;
  setSheet: (s: SheetSnap) => void;
  setInsets: (i: Partial<PracticeState['insets']>) => void;
  saveLayout: (name: string, note?: string) => Promise<void>;
  openLayout: (l: SavedLayout) => void;
  deleteLayout: (id: string) => Promise<void>;
  showToast: (msg: string) => void;
  saveSettings: (s: Partial<Settings>) => Promise<void>;
}

const R_OF = (t: TableProfile) => t.ballRadius;

/** Clamp inside the cushions and push out of other balls (§13.3). */
export function constrain(t: TableProfile, balls: Layout, id: BallId, x: number, y: number): { x: number; y: number } {
  const R = R_OF(t);
  let px = Math.min(t.L - R, Math.max(R, x));
  let py = Math.min(t.W - R, Math.max(R, y));
  for (let pass = 0; pass < 3; pass++) {
    for (const other of Object.keys(balls) as BallId[]) {
      if (other === id) continue;
      const o = balls[other];
      const dx = px - o.x;
      const dy = py - o.y;
      const d = Math.hypot(dx, dy);
      const min = 2 * R + 0.0005;
      if (d < min) {
        const nx = d > 1e-9 ? dx / d : 1;
        const ny = d > 1e-9 ? dy / d : 0;
        px = o.x + nx * min;
        py = o.y + ny * min;
      }
    }
    px = Math.min(t.L - R, Math.max(R, px));
    py = Math.min(t.W - R, Math.max(R, py));
  }
  return { x: px, y: py };
}

function defaultManual(t: TableProfile, balls: Layout, cue: BallId): CueStrike {
  const c = balls[cue];
  const target = balls.red;
  return { phi: Math.atan2(target.y - c.y, target.x - c.x), theta: (5 * Math.PI) / 180, a: 0, b: 0.1, V0: t.L > 2.5 ? 3 : 2.6 };
}

function layoutKey(t: TableProfile, balls: Layout, cue: BallId, skill: SkillLevel): string {
  const r = (v: number) => Math.round(v / 0.005);
  return `${t.id}|${JSON.stringify(t.calibration?.fitted ?? {})}|${cue}|${skill}|${(['white', 'yellow', 'red'] as BallId[]).map((b) => `${r(balls[b].x)},${r(balls[b].y)}`).join(';')}`;
}

function segsByBall(res: SimResult): Record<BallId, Segment[]> {
  const out = { white: [], yellow: [], red: [] } as Record<BallId, Segment[]>;
  for (const s of res.segments) out[s.ball].push(s);
  return out;
}

function sortOptions(opts: ShotOption[], key: SortKey): ShotOption[] {
  const arr = [...opts];
  if (key === 'easy') arr.sort((a, b) => a.difficulty - b.difficulty || b.pScore - a.pScore);
  else if (key === 'safe') arr.sort((a, b) => a.kissRisk - b.kissRisk || b.score - a.score);
  else if (key === 'leave') arr.sort((a, b) => b.leaveScore - a.leaveScore || b.score - a.score);
  else arr.sort((a, b) => b.score - a.score);
  return arr;
}

let predictTimer: ReturnType<typeof setTimeout> | null = null;
let predictId = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const initialTable = makeTable('UMB_MATCH', { name: 'Bàn thi đấu 2,84 m' });
const initialBalls = breakPositions(initialTable, 'white');

export const usePractice = create<PracticeState & PracticeActions>()((set, get) => {
  const invalidateResults = (extra: Partial<PracticeState> = {}) => {
    const s = get();
    if (s.solving) getPool().cancel(s.solveEpoch);
    set({ options: [], selectedId: undefined, current: undefined, solving: false, analysis: undefined, solveEpoch: s.solveEpoch + 1, ...extra });
    if (get().tab === 'manual') schedulePredict();
  };

  const schedulePredict = () => {
    if (predictTimer) return;
    predictTimer = setTimeout(async () => {
      predictTimer = null;
      const id = ++predictId;
      const s = get();
      try {
        const p = await getPool().main.predict(s.table, restingBalls(s.table, s.balls), s.cue, s.manualStrike);
        if (id === predictId) set({ prediction: p });
      } catch (e) {
        console.error(e);
      }
    }, 30);
  };

  return {
    table: initialTable,
    savedTables: [],
    cue: 'white',
    balls: initialBalls,
    history: [],
    future: [],
    tab: 'place',
    skill: 'intermediate',
    sort: 'score',
    options: [],
    solving: false,
    solveEpoch: 0,
    manualStrike: defaultManual(initialTable, initialBalls, 'white'),
    playback: { playing: false, speed: 1, loop: false },
    camera: 'top',
    layers: { trails: true, cue: true, systemOverlay: false },
    snap: false,
    sheet: 'collapsed',
    insets: { top: 56, bottom: 160, right: 0 },
    settings: DEFAULT_SETTINGS,
    saved: [],

    init: async () => {
      const [st, saved, tbls] = await Promise.all([settingsStore.get(), layouts.list(), tablesStore.list()]);
      set({ settings: st, saved, savedTables: tbls });
    },

    setTable: (t) => {
      const s = get();
      const sx = t.L / s.table.L;
      const sy = t.W / s.table.W;
      const next = {} as Layout;
      for (const id of ['white', 'yellow', 'red'] as BallId[]) next[id] = { x: s.balls[id].x * sx, y: s.balls[id].y * sy };
      for (const id of ['white', 'yellow', 'red'] as BallId[]) next[id] = constrain(t, next, id, next[id].x, next[id].y);
      set({ table: t, balls: next });
      invalidateResults();
    },
    setPreset: (p) => get().setTable(makeTable(p)),
    setCue: (c) => {
      set({ cue: c });
      invalidateResults();
    },

    beginDrag: (_id) => {
      const s = get();
      set({ history: [...s.history, s.balls].slice(-MAX_HISTORY), future: [] });
      invalidateResults();
    },
    moveBall: (id, x, y) => {
      const s = get();
      let nx = x;
      let ny = y;
      if (s.snap) {
        const q = s.table.L / 32;
        nx = Math.round(x / q) * q;
        ny = Math.round(y / q) * q;
      }
      const p = constrain(s.table, s.balls, id, nx, ny);
      set({ balls: { ...s.balls, [id]: p } });
      if (s.tab === 'manual') schedulePredict();
    },
    setDrag: (d) => set({ drag: d }),
    setLayout: (l, push = true) => {
      const s = get();
      if (push) set({ history: [...s.history, s.balls].slice(-MAX_HISTORY), future: [] });
      set({ balls: l });
      invalidateResults();
    },
    undo: () => {
      const s = get();
      const prev = s.history[s.history.length - 1];
      if (!prev) return;
      set({ balls: prev, history: s.history.slice(0, -1), future: [s.balls, ...s.future] });
      invalidateResults();
    },
    redo: () => {
      const s = get();
      const next = s.future[0];
      if (!next) return;
      set({ balls: next, future: s.future.slice(1), history: [...s.history, s.balls] });
      invalidateResults();
    },
    breakLayout: () => get().setLayout(breakPositions(get().table, get().cue)),
    randomLayout: () => {
      const t = get().table;
      const R = t.ballRadius;
      const out = {} as Layout;
      const ids: BallId[] = ['white', 'yellow', 'red'];
      for (const id of ids) {
        for (let tries = 0; tries < 200; tries++) {
          const x = R + 0.03 + Math.random() * (t.L - 2 * R - 0.06);
          const y = R + 0.03 + Math.random() * (t.W - 2 * R - 0.06);
          if (ids.every((o) => !out[o] || Math.hypot(out[o].x - x, out[o].y - y) > 4 * R)) {
            out[id] = { x, y };
            break;
          }
        }
      }
      get().setLayout(out);
    },

    setTab: (tab) => {
      set({ tab });
      if (tab === 'manual') {
        set({ camera: get().camera === 'free' ? 'free' : get().camera });
        schedulePredict();
      }
    },
    setSkill: (skill) => {
      set({ skill });
      if (get().options.length > 0 || get().solving) void get().findShots();
    },
    setSort: (sort) => set({ sort, options: sortOptions(get().options, sort) }),

    findShots: async () => {
      const s0 = get();
      const pool = getPool();
      if (s0.solving) pool.cancel(s0.solveEpoch);
      const epoch = s0.solveEpoch + 1;
      set({ tab: 'suggest', selectedId: undefined, current: undefined, solveEpoch: epoch, sheet: s0.sheet === 'collapsed' ? 'half' : s0.sheet });
      const key = layoutKey(s0.table, s0.balls, s0.cue, s0.skill);
      const hit = cache.get(key);
      if (hit) {
        set({ options: sortOptions(hit, get().sort), solving: false, solveStats: undefined });
        return;
      }
      set({ options: [], solving: true, solveStats: undefined });
      const buf: ShotOption[] = [];
      const stats = await pool.solve(
        {
          table: s0.table,
          balls: restingBalls(s0.table, s0.balls),
          cue: s0.cue,
          skill: s0.skill,
          maxOptions: 8,
          budgetMs: 3000,
          systems,
          familyLabels: glossary.familyLabels,
          tipUnitR: s0.settings.tipUnitR,
        },
        epoch,
        (o) => {
          if (get().solveEpoch !== epoch) return;
          buf.push({ ...o, score: rankScore(o) });
          set({ options: sortOptions(diversify(buf, 8), get().sort) });
        },
      );
      if (get().solveEpoch !== epoch) return;
      const final = get().options;
      if (cache.size > 24) cache.delete(cache.keys().next().value as string);
      cache.set(key, final);
      set({ solving: false, solveStats: stats });
    },

    selectOption: async (id) => {
      const s = get();
      if (s.selectedId === id && s.current?.optionId === id) {
        set({ selectedId: undefined });
        return;
      }
      const o = s.options.find((x) => x.id === id);
      if (!o) return;
      set({ selectedId: id });
      await get().playShot(o.strike, 'option', id);
    },
    closeOption: () => set({ selectedId: undefined }),

    setManual: (p) => {
      const s = get();
      let next = { ...s.manualStrike, ...p };
      const lim = s.table.physics.miscueLimit;
      const r = Math.hypot(next.a, next.b);
      if (r > lim) next = { ...next, a: (next.a * lim) / r, b: (next.b * lim) / r };
      set({ manualStrike: next, analysis: undefined });
      schedulePredict();
    },
    strikeManual: async () => get().playShot(get().manualStrike, 'manual'),
    tryVariant: (o) => {
      set({ tab: 'manual', manualStrike: { ...o.strike }, analysis: undefined });
      schedulePredict();
    },
    analyzeManual: async () => {
      const s = get();
      set({ analysis: 'loading' });
      const a = await getPool().main.analyze(s.table, restingBalls(s.table, s.balls), s.cue, s.manualStrike, s.skill, s.settings.tipUnitR);
      set({ analysis: a });
    },

    playShot: async (strike, source, optionId) => {
      const s = get();
      const balls = restingBalls(s.table, s.balls);
      const out = await getPool().main.simulateShot(s.table, balls, s.cue, strike);
      if (source === 'option' && get().selectedId !== optionId) return;
      const current: CurrentShot = { strike, ...out, segs: segsByBall(out.result), source, optionId };
      playClock.t = -CUE_ANIM;
      set({ current, playback: { ...get().playback, playing: true } });
      sceneApi.invalidate();
    },
    /** Take the balls where the played shot left them as the new layout (undoable) and search again from there. */
    continueFromShot: () => {
      const s = get();
      if (!s.current) return;
      const next = { ...s.balls };
      for (const b of s.current.result.final) next[b.id] = { x: b.r[0], y: b.r[1] };
      for (const id of ['white', 'yellow', 'red'] as BallId[]) next[id] = constrain(s.table, next, id, next[id].x, next[id].y);
      get().setLayout(next);
      void get().findShots();
    },
    setPlaying: (playing) => {
      const c = get().current;
      if (playing && c && playClock.t >= c.result.tEnd) playClock.t = -CUE_ANIM;
      set({ playback: { ...get().playback, playing } });
      sceneApi.invalidate();
    },
    setSpeed: (speed) => set({ playback: { ...get().playback, speed } }),
    setLoop: (loop) => set({ playback: { ...get().playback, loop } }),
    seek: (t) => {
      playClock.t = t;
      set({ playback: { ...get().playback, playing: false } });
      sceneApi.invalidate();
    },
    setCamera: (camera) => {
      set({ camera });
      sceneApi.invalidate();
    },
    toggleLayer: (k) => {
      set({ layers: { ...get().layers, [k]: !get().layers[k] } });
      sceneApi.invalidate();
    },
    setSnap: (snap) => set({ snap }),
    setSheet: (sheet) => set({ sheet }),
    setInsets: (i) => {
      const cur = get().insets;
      const next = { ...cur, ...i };
      if (next.top !== cur.top || next.bottom !== cur.bottom || next.right !== cur.right) {
        set({ insets: next });
        sceneApi.invalidate();
      }
    },

    saveLayout: async (name, note = '') => {
      const s = get();
      const l: SavedLayout = {
        id: uid(),
        name: name || `Thế bi ${new Date().toLocaleString('vi-VN')}`,
        note,
        createdAt: new Date().toISOString(),
        engineVersion: ENGINE_VERSION,
        tableId: s.table.id,
        cue: s.cue,
        balls: s.balls,
        strike: s.tab === 'manual' ? s.manualStrike : s.options.find((o) => o.id === s.selectedId)?.strike,
      };
      await layouts.save(l);
      set({ saved: await layouts.list() });
      get().showToast('Đã lưu thế bi');
    },
    openLayout: (l) => {
      const s = get();
      const t = s.savedTables.find((x) => x.id === l.tableId) ?? (l.tableId.startsWith('preset:') ? makeTable(l.tableId.slice(7) as Exclude<TablePreset, 'CUSTOM'>) : s.table);
      set({ table: t, cue: l.cue });
      get().setLayout(l.balls);
      if (l.strike) {
        set({ tab: 'manual', manualStrike: l.strike });
        schedulePredict();
      }
    },
    deleteLayout: async (id) => {
      await layouts.remove(id);
      set({ saved: await layouts.list() });
    },
    showToast: (msg) => {
      set({ toast: msg });
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => set({ toast: undefined }), 2200);
    },
    saveSettings: async (p) => {
      const next = { ...get().settings, ...p };
      set({ settings: next });
      await settingsStore.save(next);
    },
  };
});
