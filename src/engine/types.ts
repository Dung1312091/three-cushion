export type Vec3 = [number, number, number];
export type BallId = 'white' | 'yellow' | 'red';
export type MotionState = 'stationary' | 'spinning' | 'rolling' | 'sliding';
export type CushionId = 'S1' | 'S2' | 'L1' | 'L2';

export const BALL_IDS: readonly BallId[] = ['white', 'yellow', 'red'];
export const CUSHION_IDS: readonly CushionId[] = ['S1', 'S2', 'L1', 'L2'];

export interface BallState {
  id: BallId;
  r: Vec3;
  v: Vec3;
  w: Vec3;
  s: MotionState;
}

export interface CueStrike {
  phi: number;
  theta: number;
  a: number;
  b: number;
  V0: number;
}

export type SimEvent =
  | { t: number; type: 'strike'; ball: BallId }
  | { t: number; type: 'ball-ball'; a: BallId; b: BallId; pos: [number, number]; relSpeed: number }
  | { t: number; type: 'ball-cushion'; ball: BallId; cushion: CushionId; pos: [number, number]; speedIn: number }
  | { t: number; type: 'transition'; ball: BallId; from: MotionState; to: MotionState };

/** One analytic motion piece of ONE ball between two of its events. */
export interface Segment {
  ball: BallId;
  t0: number;
  t1: number;
  state: MotionState;
  r0: Vec3;
  v0: Vec3;
  w0: Vec3;
  acc: Vec3;
  wAcc: Vec3;
}

export interface KissInfo {
  t: number;
  pair: [BallId, BallId];
  kind: 'object-object' | 'cue-object-repeat';
  effect: 'kiss-out' | 'lucky' | 'neutral';
  /** Index of this collision among all ball-ball events (used to re-simulate with it disabled). */
  ballBallIndex: number;
}

export interface RuleOutcome {
  scored: boolean;
  firstObject?: BallId;
  secondObject?: BallId;
  cushionsBeforeSecond: number;
  cueCushionSeq: CushionId[];
  firstContact: 'ball' | 'rail';
  kisses: KissInfo[];
  /** Time the cue ball touched the second object ball (if it did). */
  tSecond?: number;
}

export interface ShotResult {
  events: SimEvent[];
  segments: Segment[];
  final: BallState[];
  tEnd: number;
  rules: RuleOutcome;
  truncated: boolean;
}
