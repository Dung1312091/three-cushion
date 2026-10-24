import { createStore, del, entries, get, set } from 'idb-keyval';
import type { TableProfile } from '@/engine/table';
import type { BallId, CueStrike } from '@/engine/types';

const store = typeof indexedDB !== 'undefined' ? createStore('ba-bang', 'kv') : undefined;

export interface SavedLayout {
  id: string;
  name: string;
  note: string;
  createdAt: string;
  engineVersion: string;
  tableId: string;
  cue: BallId;
  balls: Record<BallId, { x: number; y: number }>;
  strike?: CueStrike;
}

export interface Settings {
  /** R per tip (§9). [CẦN HLV DUYỆT] */
  tipUnitR: number;
  clothColor: string;
  /** Bộ số display scale: ×10 (corner = 50) or ×1 (Corner-5). */
  systemScale: 10 | 1;
}

export const DEFAULT_SETTINGS: Settings = { tipUnitR: 0.15, clothColor: '#1D5BB8', systemScale: 10 };

async function listPrefix<T>(prefix: string): Promise<T[]> {
  if (!store) return [];
  try {
    const all = await entries(store);
    return all.filter(([k]) => String(k).startsWith(prefix)).map(([, v]) => v as T);
  } catch {
    return [];
  }
}

export const layouts = {
  list: async (): Promise<SavedLayout[]> =>
    (await listPrefix<SavedLayout>('layout:')).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  save: async (l: SavedLayout): Promise<void> => {
    if (store) await set(`layout:${l.id}`, l, store);
  },
  remove: async (id: string): Promise<void> => {
    if (store) await del(`layout:${id}`, store);
  },
};

export const tables = {
  list: async (): Promise<TableProfile[]> => listPrefix<TableProfile>('table:'),
  save: async (t: TableProfile): Promise<void> => {
    if (store) await set(`table:${t.id}`, t, store);
  },
  remove: async (id: string): Promise<void> => {
    if (store) await del(`table:${id}`, store);
  },
};

export const settings = {
  get: async (): Promise<Settings> => {
    if (!store) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...((await get('settings', store)) as Partial<Settings> | undefined) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  save: async (s: Settings): Promise<void> => {
    if (store) await set('settings', s, store);
  },
};

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
