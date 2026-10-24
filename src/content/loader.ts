import type { ComponentType } from 'react';
import data from '@/generated/content.json';
import type { ArticleFrontmatter, DiagramSpec, Glossary, SystemDefinition } from './schema';

export interface ArticleMeta extends ArticleFrontmatter {
  slug: string;
  readingMinutes: number;
}

export interface DrillEntry extends DiagramSpec {
  /** Paths computed by the engine at build time when the drill has a strike but no hand-drawn paths. */
  computedPaths?: DiagramSpec['paths'];
}

interface ContentData {
  articles: ArticleMeta[];
  glossary: Glossary;
  systems: SystemDefinition[];
  drills: DrillEntry[];
}

const content = data as unknown as ContentData;

export const articles: ArticleMeta[] = content.articles;
export const glossary: Glossary = content.glossary;
export const systems: SystemDefinition[] = content.systems;
export const drills: DrillEntry[] = content.drills;

export const findArticle = (category: string, slug: string): ArticleMeta | undefined =>
  articles.find((a) => a.category === category && a.slug === slug);
export const findSystem = (id: string): SystemDefinition | undefined => systems.find((s) => s.id === id);
export const findDrill = (id: string): DrillEntry | undefined => drills.find((d) => d.id === id);
export const findTerm = (id: string) => glossary.entries.find((e) => e.id === id);

type MdxModule = { default: ComponentType<{ components?: Record<string, unknown> }> };
const mdxModules = import.meta.glob<MdxModule>('/content/articles/**/*.mdx');

export function loadArticleBody(category: string, slug: string): Promise<MdxModule> | null {
  const loader = mdxModules[`/content/articles/${category}/${slug}.mdx`];
  return loader ? loader() : null;
}
