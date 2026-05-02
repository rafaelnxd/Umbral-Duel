import {
  FIGHTER_HURTBOX,
  LIGHT_ATTACK,
  LIGHT_ATTACK_HITBOX,
  LIGHT_ATTACK_TOTAL_MS
} from "../combat/constants";
import { getLightAttackPhase } from "../combat/attackState";
import { rectsOverlap } from "../combat/geometry";
import { enterState } from "../combat/fighter";
import { resolveHit } from "../combat/resolveHit";
import type { CombatRect, HitOutcome } from "../combat/types";
import type { FighterEntity } from "./FighterEntity";

export type CombatEvent =
  | { result: "none" }
  | {
      result: HitOutcome["result"];
      x: number;
      y: number;
      defenderId: string;
      defenderPostureBroken: boolean;
    };

export class CombatSystem {
  updateAttack(attacker: FighterEntity, defender: FighterEntity, deltaMs: number): CombatEvent {
    if (attacker.model.state !== "attack") return { result: "none" };

    attacker.attackElapsedMs += deltaMs;
    const phase = getLightAttackPhase(attacker.attackElapsedMs);
    if (phase === "complete" || attacker.attackElapsedMs >= LIGHT_ATTACK_TOTAL_MS) {
      attacker.model = enterState(attacker.model, "idle");
      return { result: "none" };
    }

    if (phase !== "active" || attacker.hitIds.has(defender.id)) return { result: "none" };

    const attackRect = this.getAttackRect(attacker);
    const hurtRect = this.getHurtbox(defender);
    if (!rectsOverlap(attackRect, hurtRect)) return { result: "none" };

    const outcome = resolveHit(attacker.model, defender.model, LIGHT_ATTACK);
    attacker.model = outcome.attacker;
    defender.model = outcome.defender;
    attacker.hitIds.add(defender.id);

    return {
      result: outcome.result,
      x: defender.sprite.x,
      y: defender.sprite.y - 40,
      defenderId: defender.id,
      defenderPostureBroken: defender.model.state === "postureBroken"
    };
  }

  getHurtbox(entity: FighterEntity): CombatRect {
    return {
      x: entity.sprite.x - FIGHTER_HURTBOX.width / 2,
      y: entity.sprite.y + FIGHTER_HURTBOX.verticalOffset,
      width: FIGHTER_HURTBOX.width,
      height: FIGHTER_HURTBOX.height
    };
  }

  getAttackRect(entity: FighterEntity): CombatRect {
    const direction = entity.model.facing === "right" ? 1 : -1;
    const x =
      direction === 1
        ? entity.sprite.x + LIGHT_ATTACK_HITBOX.xOffset
        : entity.sprite.x - LIGHT_ATTACK_HITBOX.xOffset - LIGHT_ATTACK_HITBOX.width;

    return {
      x,
      y: entity.sprite.y + LIGHT_ATTACK_HITBOX.verticalOffset,
      width: LIGHT_ATTACK_HITBOX.width,
      height: LIGHT_ATTACK_HITBOX.height
    };
  }
}
