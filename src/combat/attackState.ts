import {
  LIGHT_ATTACK_ACTIVE_MS,
  LIGHT_ATTACK_STARTUP_MS,
  LIGHT_ATTACK_TOTAL_MS
} from "./constants";
import type { AttackPhase } from "./types";

export function getLightAttackPhase(elapsedMs: number): AttackPhase {
  if (elapsedMs < 0) return "none";
  if (elapsedMs < LIGHT_ATTACK_STARTUP_MS) return "startup";
  if (elapsedMs < LIGHT_ATTACK_STARTUP_MS + LIGHT_ATTACK_ACTIVE_MS) return "active";
  if (elapsedMs < LIGHT_ATTACK_TOTAL_MS) return "recovery";
  return "complete";
}

export function isAttackRecovering(elapsedMs: number): boolean {
  return getLightAttackPhase(elapsedMs) === "recovery";
}
