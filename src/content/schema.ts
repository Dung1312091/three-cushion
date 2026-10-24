import { z } from 'zod';

export const CATEGORIES = [
  'co-ban',
  'diem-cham-va-xoay',
  'do-day-va-goc',
  'luc',
  'bo-so',
  'the-bi',
  'ky-thuat-nang-cao',
  'chien-thuat',
  'bai-tap',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const LEVELS = ['nhap-mon', 'co-ban', 'trung-cap', 'nang-cao'] as const;
export type Level = (typeof LEVELS)[number];

const CushionId = z.enum(['S1', 'S2', 'L1', 'L2']);
const Source = z.object({ title: z.string(), url: z.string().url() });

export const ArticleFrontmatter = z.object({
  title: z.string(),
  category: z.enum(CATEGORIES),
  level: z.enum(LEVELS),
  tags: z.array(z.string()),
  railCode: z.string().optional(),
  firstContact: z.enum(['ball', 'rail']).optional(),
  english: z.enum(['thuận', 'nghịch', 'không']).optional(),
  systemIds: z.array(z.string()).default([]),
  diagrams: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  summary: z.string(),
  reviewStatus: z.enum(['draft', 'coach_reviewed']).default('draft'),
  sources: z.array(Source).default([]),
});
export type ArticleFrontmatter = z.infer<typeof ArticleFrontmatter>;

/** Position on the table in diamond units: x ∈ [0, 8], y ∈ [0, 4]. */
export const Pos = z.object({ x: z.number().min(0).max(8), y: z.number().min(0).max(4) });
export type Pos = z.infer<typeof Pos>;

export const DiagramSpec = z.object({
  id: z.string(),
  title: z.string().optional(),
  table: z.enum(['UMB_MATCH', 'MID_2540', 'KR_DOMESTIC_MID', 'HALF_MATCH', 'SMALL']).default('UMB_MATCH'),
  balls: z.object({ white: Pos, yellow: Pos, red: Pos }),
  cue: z.enum(['white', 'yellow']).default('white'),
  strike: z
    .object({ phiDeg: z.number(), thetaDeg: z.number(), a: z.number(), b: z.number(), V0: z.number() })
    .optional(),
  paths: z
    .array(
      z.object({
        ball: z.enum(['white', 'yellow', 'red']),
        points: z.array(Pos),
        style: z.enum(['solid', 'dashed']),
      }),
    )
    .optional(),
  annotations: z
    .array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('label'), at: Pos, text: z.string() }),
        z.object({ type: z.literal('arrow'), from: Pos, to: Pos }),
        z.object({ type: z.literal('systemOverlay'), systemId: z.string() }),
      ]),
    )
    .default([]),
  caption: z.string().optional(),
  level: z.enum(LEVELS).optional(),
});
export type DiagramSpec = z.infer<typeof DiagramSpec>;

const NumberingPoint = z.object({ value: z.number(), cushion: CushionId, diamond: z.number() });
export type NumberingPoint = z.infer<typeof NumberingPoint>;

export const SystemDefinition = z.object({
  id: z.string(),
  names: z.object({ vi: z.string(), en: z.string(), ko: z.string().optional(), aliases: z.array(z.string()) }),
  family: z.enum(['corner5_subtractive', 'plus_additive', 'cup_additive', 'other']),
  equation: z.string(),
  summary: z.string(),
  railSequence: z.string(),
  firstContact: z.enum(['rail', 'ball']),
  arrivalRailIndex: z.union([z.literal(3), z.literal(4)]),
  aimReference: z.union([
    z.literal('through_diamond'),
    z.literal('opposite_diamond'),
    z.object({ mixedThreshold: z.number() }),
  ]),
  numbering: z.object({
    start: z.array(NumberingPoint),
    aim: z.array(NumberingPoint),
    arrival: z.array(NumberingPoint),
  }),
  base: z.object({ spinTips: z.number(), english: z.enum(['thuận', 'nghịch']), speedNote: z.string() }),
  corrections: z.array(
    z.object({
      variable: z.enum(['start', 'spinTips', 'speed', 'cloth']),
      points: z.array(z.tuple([z.number(), z.number()])),
      note: z.string(),
      confidence: z.enum(['verified', 'single_source', 'conflicting']),
    }),
  ),
  validStartRange: z.tuple([z.number(), z.number()]),
  failureModes: z.array(z.string()),
  sources: z.array(Source),
  reviewStatus: z.enum(['draft', 'coach_reviewed']),
});
export type SystemDefinition = z.infer<typeof SystemDefinition>;

export const GlossaryEntry = z.object({
  id: z.string(),
  term: z.string(),
  aliases: z.array(z.string()),
  en: z.string(),
  definition: z.string(),
  origin: z.string().optional(),
  confidence: z.enum(['verified', 'unverified']),
  sources: z.array(Source).default([]),
});
export type GlossaryEntry = z.infer<typeof GlossaryEntry>;

export const Glossary = z.object({
  entries: z.array(GlossaryEntry),
  /** Query-expansion groups (§11.4). Each group is a set of interchangeable spellings. */
  synonyms: z.array(z.array(z.string())),
  /** railCode + firstContact → Vietnamese family label (§7). Key format: "rail+LSL" / "ball+*". */
  familyLabels: z.record(z.string(), z.string()),
});
export type Glossary = z.infer<typeof Glossary>;
