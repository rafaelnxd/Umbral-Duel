import {
  HITSTUN_MS,
  PARRY_WINDOW_MS,
  POSTURE_BREAK_STUN_MS,
  POSTURE_RECOVERY_PER_SECOND,
  ROLL_DURATION_MS
} from "./constants";
import type { Fighter } from "./types";

export function tickFighter(fighter: Fighter, deltaMs: number): Fighter {
  const stateTimeMs = fighter.stateTimeMs + deltaMs;
  const invulnerableMs = Math.max(0, fighter.invulnerableMs - deltaMs);
  let next: Fighter = { ...fighter, stateTimeMs, invulnerableMs };

  if (next.state === "parry" && stateTimeMs > PARRY_WINDOW_MS) {
    next = { ...next, state: "block" };
  }

  if (next.state === "roll" && stateTimeMs >= ROLL_DURATION_MS) {
    next = { ...next, state: "idle", stateTimeMs: 0 };
  }

  if (next.state === "hitstun" && stateTimeMs >= HITSTUN_MS) {
    next = { ...next, state: "idle", stateTimeMs: 0 };
  }

  if (next.state === "postureBroken" && stateTimeMs >= POSTURE_BREAK_STUN_MS) {
    next = {
      ...next,
      state: "idle",
      stateTimeMs: 0,
      posture: Math.max(next.maxPosture * 0.35, next.posture)
    };
  }

  if (next.state === "idle" || next.state === "run" || next.state === "jump") {
    next = {
      ...next,
      posture: Math.min(
        next.maxPosture,
        next.posture + POSTURE_RECOVERY_PER_SECOND * (deltaMs / 1000)
      )
    };
  }

  return next;
}
