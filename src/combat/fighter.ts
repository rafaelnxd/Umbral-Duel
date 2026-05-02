import { MAX_LIFE, MAX_POSTURE, PARRY_WINDOW_MS, ROLL_INVULNERABLE_MS } from "./constants";
import type { Facing, Fighter, FighterState } from "./types";

export function createFighter(id: string, facing: Facing): Fighter {
  return {
    id,
    life: MAX_LIFE,
    maxLife: MAX_LIFE,
    posture: MAX_POSTURE,
    maxPosture: MAX_POSTURE,
    state: "idle",
    facing,
    stateTimeMs: 0,
    invulnerableMs: 0,
    grounded: true
  };
}

export function enterState(fighter: Fighter, state: FighterState): Fighter {
  const next: Fighter = { ...fighter, state, stateTimeMs: 0 };
  if (state === "parry") {
    return next;
  }
  if (state === "roll") {
    return { ...next, invulnerableMs: ROLL_INVULNERABLE_MS };
  }
  return next;
}

export function beginBlock(fighter: Fighter): Fighter {
  return enterState(fighter, "parry");
}

export function isInParryWindow(fighter: Fighter): boolean {
  return fighter.state === "parry" && fighter.stateTimeMs <= PARRY_WINDOW_MS;
}
