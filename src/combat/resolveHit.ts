import { HITSTUN_MS } from "./constants";
import { isInParryWindow } from "./fighter";
import type { AttackProfile, Fighter, HitOutcome } from "./types";

function applyPostureDamage(fighter: Fighter, postureDamage: number): Fighter {
  const posture = Math.max(0, fighter.posture - postureDamage);
  if (posture <= 0) {
    return { ...fighter, posture: 0, state: "postureBroken", stateTimeMs: 0 };
  }
  return { ...fighter, posture };
}

export function resolveHit(attacker: Fighter, defender: Fighter, attack: AttackProfile): HitOutcome {
  if (defender.invulnerableMs > 0 || defender.state === "roll") {
    return { attacker, defender, result: "invulnerable" };
  }

  if (isInParryWindow(defender)) {
    const nextAttacker = applyPostureDamage(attacker, attack.parriedPostureDamage);
    return { attacker: nextAttacker, defender, result: "parried" };
  }

  if (defender.state === "block") {
    const postureTarget = applyPostureDamage(defender, attack.blockedPostureDamage);
    return {
      attacker,
      defender: {
        ...postureTarget,
        life: Math.max(0, postureTarget.life - attack.blockedLifeDamage)
      },
      result: "blocked"
    };
  }

  const damaged = applyPostureDamage(defender, attack.postureDamage);
  return {
    attacker,
    defender: {
      ...damaged,
      life: Math.max(0, damaged.life - attack.lifeDamage),
      state: damaged.state === "postureBroken" ? "postureBroken" : "hitstun",
      stateTimeMs: damaged.state === "postureBroken" ? damaged.stateTimeMs : 0
    },
    result: "hit"
  };
}
