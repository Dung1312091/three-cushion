import type { Options } from 'minisearch';
import { viFold } from './viFold';

export interface SearchDoc {
  id: string;
  kind: 'article' | 'term' | 'system';
  /** Route to open. */
  href: string;
  title: string;
  aliases: string[];
  tags: string[];
  summary: string;
  body: string;
  category?: string;
}

/** Shared by the build script (index) and the app (loadJSON) — must stay identical. */
export const SEARCH_OPTIONS: Options<SearchDoc> = {
  idField: 'id',
  fields: ['title', 'aliases', 'tags', 'summary', 'body'],
  storeFields: ['kind', 'href', 'title', 'summary', 'category'],
  extractField: (doc, field) => {
    const v = (doc as unknown as Record<string, unknown>)[field];
    return Array.isArray(v) ? v.join(' ') : ((v as string | undefined) ?? '');
  },
  processTerm: (term) => {
    const t = viFold(term).trim();
    return t.length > 0 ? t : null;
  },
  searchOptions: {
    boost: { title: 3, aliases: 3, tags: 2 },
    fuzzy: 0.2,
    prefix: true,
    combineWith: 'AND',
  },
};
