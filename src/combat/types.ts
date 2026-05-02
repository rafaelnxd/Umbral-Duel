export type Facing = "left" | "right";

export type FighterState =
  | "idle"
  | "run"
  | "jump"
  | "attack"
  | "block"
  | "parry"
  | "roll"
  | "hitstun"
  | "postureBroken";

export interface Fighter {
  id: string;
  life: number;
  maxLife: number;
  posture: number;
  maxPosture: number;
  state: FighterState;
  facing: Facing;
  stateTimeMs: number;
  invulnerableMs: number;
  grounded: boolean;
}

export interface AttackProfile {
  lifeDamage: number;
  postureDamage: number;
  blockedLifeDamage: number;
  blockedPostureDamage: number;
  parriedPostureDamage: number;
}

export interface HitOutcome {
  defender: Fighter;
  attacker: Fighter;
  result: "hit" | "blocked" | "parried" | "invulnerable";
}

export interface FighterIntent {
  move: -1 | 0 | 1;
  jump: boolean;
  roll: boolean;
  attack: boolean;
  block: boolean;
}

export interface CombatRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AttackRuntime {
  attackId: number;
  elapsedMs: number;
  hasHitIds: Set<string>;
}

export type AttackPhase = "none" | "startup" | "active" | "recovery" | "complete";
