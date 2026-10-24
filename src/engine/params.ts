export interface PhysicsParams {
  g: number;
  /** μs ball–cloth sliding friction [CẦN HIỆU CHUẨN] */
  muSlide: number;
  /** μr rolling resistance [CẦN HIỆU CHUẨN] */
  muRoll: number;
  /** αsp, rad/s² — decay of spin about the vertical axis */
  spinDecel: number;
  eBall: number;
  ballFriction: 'alciatore';
  cushionModel: 'mathavan' | 'impulse' | 'han2005';
  /** e_c [CẦN HIỆU CHUẨN] */
  eCushion: number;
  /** μw ball–cushion friction [CẦN HIỆU CHUẨN] */
  muCushion: number;
  /** Override for sinθc; by default derived from cushion height. */
  cushionContactSin?: number;
  cushionRestitutionModel: 'constant' | 'speedPoly';
  mathavanStepsFine: number;
  mathavanStepsFast: number;
  cueMass: number;
  tipRestitution: number;
  /** m / m_e [CHƯA KIỂM CHỨNG] */
  squirtMassRatio: number;
  /** In units of R. */
  miscueLimit: number;
}

export const DEFAULT_PHYSICS: PhysicsParams = {
  g: 9.81,
  muSlide: 0.2,
  muRoll: 0.008,
  spinDecel: 10,
  eBall: 0.95,
  ballFriction: 'alciatore',
  cushionModel: 'mathavan',
  eCushion: 0.8,
  muCushion: 0.15,
  cushionRestitutionModel: 'constant',
  mathavanStepsFine: 5000,
  mathavanStepsFast: 200,
  cueMass: 0.5,
  tipRestitution: 1.0,
  squirtMassRatio: 25,
  miscueLimit: 0.5,
};

/** Bump on any change that alters simulation output (§16). */
export const ENGINE_VERSION = '1.0.0';
