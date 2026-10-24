/**
 * Content pipeline (§11): validate every content file with Zod, compute drill
 * paths with the engine when needed, and emit the JSON + search index the app imports.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import MiniSearch from 'minisearch';
import { z } from 'zod';
import { ArticleFrontmatter, DiagramSpec, Glossary, SystemDefinition } from '../src/content/schema';
import { makeTable, restingBalls, sampleTrack, simulate } from '../src/engine';
import type { BallId } from '../src/engine/types';
import { SEARCH_OPTIONS, type SearchDoc } from '../src/lib/searchOptions';

const root = path.resolve(import.meta.dirname, '..');
const contentDir = path.join(root, 'content');
const outDir = path.join(root, 'src', 'generated');
const errors: string[] = [];

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function walk(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, ext));
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out.sort();
}

function parseOr<T>(schema: z.ZodType<T>, value: unknown, where: string): T | null {
  const r = schema.safeParse(value);
  if (r.success) return r.data;
  errors.push(`${where}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  return null;
}

function plainText(mdx: string): string {
  return mdx
    .replace(/<[A-Z][^>]*\/>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_>`|[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Articles
const articles = walk(path.join(contentDir, 'articles'), '.mdx').flatMap((file) => {
  const rel = path.relative(path.join(contentDir, 'articles'), file);
  const [category] = rel.split(path.sep);
  const slug = path.basename(file, '.mdx');
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const fm = parseOr(ArticleFrontmatter, data, rel);
  if (!fm) return [];
  if (fm.category !== category) errors.push(`${rel}: category "${fm.category}" ≠ folder "${category}"`);
  const body = plainText(content);
  const words = body.split(' ').length;
  return [{ ...fm, slug, readingMinutes: Math.max(1, Math.round(words / 200)), body }];
});

// Glossary
const glossaryFile = path.join(contentDir, 'glossary.json');
const glossary = (fs.existsSync(glossaryFile) && parseOr(Glossary, readJson(glossaryFile), 'glossary.json')) || {
  entries: [],
  synonyms: [],
  familyLabels: {},
};

// Systems
const systems = walk(path.join(contentDir, 'systems'), '.json').flatMap((f) => {
  const s = parseOr(SystemDefinition, readJson(f), path.relative(contentDir, f));
  return s ? [s] : [];
});

// Drills (+ engine-computed paths)
const drills = walk(path.join(contentDir, 'drills'), '.json').flatMap((f) => {
  const d = parseOr(DiagramSpec, readJson(f), path.relative(contentDir, f));
  if (!d) return [];
  if (d.id !== path.basename(f, '.json')) errors.push(`${path.relative(contentDir, f)}: id "${d.id}" ≠ filename`);
  if (!d.strike || d.paths) return [d];
  const table = makeTable(d.table);
  const D = table.L / 8;
  const pos = Object.fromEntries(Object.entries(d.balls).map(([k, p]) => [k, { x: p.x * D, y: p.y * D }]));
  const balls = restingBalls(table, pos as Record<BallId, { x: number; y: number }>);
  const s = d.strike;
  const deg = Math.PI / 180;
  const res = simulate(table, balls, d.cue, { phi: s.phiDeg * deg, theta: s.thetaDeg * deg, a: s.a, b: s.b, V0: s.V0 });
  const computedPaths = (['white', 'yellow', 'red'] as BallId[]).map((ball) => {
    const tr = sampleTrack(res, ball, 20);
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < tr.length; i += 2) {
      const p = { x: +(tr[i] / D).toFixed(3), y: +(tr[i + 1] / D).toFixed(3) };
      const last = points[points.length - 1];
      if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 0.02) points.push(p);
    }
    return { ball, points, style: ball === d.cue ? ('solid' as const) : ('dashed' as const) };
  }).filter((p) => p.points.length > 1);
  return [{ ...d, computedPaths }];
});

// Cross-references in MDX
const drillIds = new Set(drills.map((d) => d.id));
const termIds = new Set(glossary.entries.map((e) => e.id));
const systemIds = new Set(systems.map((s) => s.id));
for (const file of walk(path.join(contentDir, 'articles'), '.mdx')) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(contentDir, file);
  for (const m of src.matchAll(/<(Diagram|OpenInPractice|Term|SystemCalc)\s+(?:id|drill)="([^"]+)"/g)) {
    const [, comp, id] = m;
    const ok = comp === 'Term' ? termIds.has(id) : comp === 'SystemCalc' ? systemIds.has(id) : drillIds.has(id);
    if (!ok) errors.push(`${rel}: <${comp}> references unknown id "${id}"`);
  }
}

if (errors.length) {
  console.error(`Content validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

// Search index
const docs: SearchDoc[] = [
  ...articles.map((a) => ({
    id: `a:${a.category}/${a.slug}`,
    kind: 'article' as const,
    href: `/ly-thuyet/${a.category}/${a.slug}`,
    title: a.title,
    aliases: a.aliases,
    tags: a.tags,
    summary: a.summary,
    body: a.body,
    category: a.category,
  })),
  ...glossary.entries.map((e) => ({
    id: `t:${e.id}`,
    kind: 'term' as const,
    href: `/thuat-ngu#${e.id}`,
    title: e.term,
    aliases: [...e.aliases, e.en],
    tags: [],
    summary: e.definition,
    body: e.origin ?? '',
  })),
  ...systems.map((s) => ({
    id: `s:${s.id}`,
    kind: 'system' as const,
    href: `/bo-so/${s.id}`,
    title: s.names.vi,
    aliases: [...s.names.aliases, s.names.en, s.names.ko ?? ''],
    tags: [s.railSequence],
    summary: s.summary,
    body: `${s.equation} ${s.failureModes.join(' ')}`,
  })),
];
const mini = new MiniSearch<SearchDoc>(SEARCH_OPTIONS);
mini.addAll(docs);

fs.mkdirSync(outDir, { recursive: true });
const articlesMeta = articles.map(({ body: _body, ...rest }) => rest);
fs.writeFileSync(path.join(outDir, 'content.json'), JSON.stringify({ articles: articlesMeta, glossary, systems, drills }));
fs.writeFileSync(path.join(outDir, 'search-index.json'), JSON.stringify(mini.toJSON()));
console.log(`content: ${articles.length} articles, ${glossary.entries.length} terms, ${systems.length} systems, ${drills.length} drills → src/generated`);
