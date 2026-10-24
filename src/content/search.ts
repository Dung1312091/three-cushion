import MiniSearch from 'minisearch';
import { SEARCH_OPTIONS, type SearchDoc } from '@/lib/searchOptions';
import { viFold } from '@/lib/viFold';
import { glossary } from './loader';

let index: MiniSearch<SearchDoc> | null = null;
let loading: Promise<MiniSearch<SearchDoc>> | null = null;

export function loadIndex(): Promise<MiniSearch<SearchDoc>> {
  if (index) return Promise.resolve(index);
  loading ??= import('@/generated/search-index.json').then((m) => {
    index = MiniSearch.loadJSON<SearchDoc>(JSON.stringify(m.default), SEARCH_OPTIONS);
    return index;
  });
  return loading;
}

/** §11.4 — expand the query with every spelling in a matching synonym group. */
export function expandQuery(q: string): string[] {
  const folded = viFold(q);
  const out = new Set<string>([q]);
  for (const group of glossary.synonyms) {
    const hit = group.find((s) => {
      const f = viFold(s);
      return f.length > 1 && (folded === f || folded.includes(f));
    });
    if (!hit) continue;
    const hf = viFold(hit);
    for (const alt of group) out.add(folded.replace(hf, viFold(alt)));
  }
  return [...out];
}

export interface SearchHit {
  id: string;
  kind: SearchDoc['kind'];
  href: string;
  title: string;
  summary: string;
  category?: string;
  score: number;
}

export async function search(q: string): Promise<SearchHit[]> {
  const query = q.trim();
  if (!query) return [];
  const idx = await loadIndex();
  const scores = new Map<string, SearchHit>();
  const raw = query.toLowerCase();
  for (const variant of expandQuery(query)) {
    for (const r of idx.search(variant)) {
      const title = String(r.title);
      // Rank exact accented matches higher than folded ones.
      const accentBoost = title.toLowerCase().includes(raw) ? 1.5 : 1;
      const hit: SearchHit = {
        id: r.id as string,
        kind: r.kind as SearchDoc['kind'],
        href: r.href as string,
        title,
        summary: String(r.summary ?? ''),
        category: r.category as string | undefined,
        score: r.score * accentBoost,
      };
      const prev = scores.get(hit.id);
      if (!prev || prev.score < hit.score) scores.set(hit.id, hit);
    }
  }
  return [...scores.values()].sort((a, b) => b.score - a.score);
}
