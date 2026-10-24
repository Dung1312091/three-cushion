import type { SystemDefinition } from '../content/schema';
import type { TableProfile } from '../engine/table';
import type { BallId, BallState, CueStrike, CushionId } from '../engine/types';
import type { SystemMatch } from '../systems/match';

export type { SystemMatch };

export type SkillLevel = 'pro' | 'advanced' | 'intermediate' | 'beginner';

/** Execution noise per skill level (1σ). [CHƯA KIỂM CHỨNG — no data on amateur players yet] */
export const SKILL_NOISE: Record<SkillLevel, { phiDeg: number; speedPct: number; tipR: number; thetaDeg: number }> = {
  pro: { phiDeg: 0.125, speedPct: 2, tipR: 0.016, thetaDeg: 0.1 },
  advanced: { phiDeg: 0.25, speedPct: 5, tipR: 0.03, thetaDeg: 0.5 },
  intermediate: { phiDeg: 0.4, speedPct: 8, tipR: 0.06, thetaDeg: 1 },
  beginner: { phiDeg: 0.6, speedPct: 12, tipR: 0.1, thetaDeg: 2 },
};

export interface SolveRequest {
  table: TableProfile;
  balls: BallState[];
  cue: BallId;
  skill: SkillLevel;
  maxOptions: number;
  budgetMs: number;
  systems?: SystemDefinition[];
  familyLabels?: Record<string, string>;
  /** R per tip for the instruction text (§9, default 0.15). */
  tipUnitR?: number;
}

export interface HumanInstruction {
  aim: {
    mode: 'ball-first' | 'rail-first';
    ghostBall?: { x: number; y: number };
    thickness?: { fraction: number; label: string; side: 'trái' | 'phải' };
    railPoint?: { cushion: CushionId; diamond: number; throughDiamond: boolean };
    systemNumber?: { systemId: string; value: number };
  };
  tip: { clock: number; tips: number; a: number; b: number };
  elevationDeg: number;
  speed: { V0: number; level: number; levelLabel: string };
  stroke: 'thuong' | 'cule' | 'tro' | 'dan' | 'masse' | 'bo';
  english: 'thuận' | 'nghịch' | 'không';
  summaryVi: string;
}

export interface ShotFamily {
  firstContact: 'ball' | 'rail';
  railCode: string;
  english: 'running' | 'reverse' | 'none';
  labelVi: string;
}

export interface ShotOption {
  id: string;
  strike: CueStrike;
  firstObject: BallId;
  family: ShotFamily;
  system?: SystemMatch;
  pScore: number;
  pScoreCI: [number, number];
  kissRisk: number;
  tolerance: { phiDeg: [number, number]; speedPct: [number, number]; sideTips: [number, number] };
  difficulty: 1 | 2 | 3 | 4 | 5;
  leaveScore: number;
  finalPositions: Record<BallId, { x: number; y: number; ellipse: { rx: number; ry: number; rot: number } }>;
  instruction: HumanInstruction;
  /** Ranking score (§8.2 step 9). */
  score: number;
}

export interface SolveStats {
  sims: number;
  candidates: number;
  elapsedMs: number;
  partial: boolean;
}

export type SolveProgress = { kind: 'option'; option: ShotOption } | { kind: 'done'; stats: SolveStats };
