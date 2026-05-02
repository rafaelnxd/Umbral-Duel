import {
  BOT_APPROACH_RANGE,
  BOT_ATTACK_COOLDOWN_MAX_MS,
  BOT_ATTACK_COOLDOWN_MIN_MS,
  BOT_BLOCK_CHANCE,
  BOT_HOLD_RANGE_MAX_MS,
  BOT_HOLD_RANGE_MIN_MS,
  BOT_LOW_POSTURE_RETREAT_RANGE,
  BOT_LOW_POSTURE_THRESHOLD,
  BOT_OPTIMAL_RANGE,
  BOT_PARRY_CHANCE,
  BOT_PUNISH_CHANCE,
  BOT_REACTION_DELAY_MS,
  BOT_ROLL_COOLDOWN_MS,
  BOT_TOO_CLOSE_RANGE
} from "../../combat/constants";
import type { FighterIntent } from "../../combat/types";
import type { ControllerContext, FighterController } from "./types";
import { neutralIntent } from "./types";

export class BotController implements FighterController {
  private attackCooldownMs = 300;
  private rollCooldownMs = 900;
  private reactionMs = BOT_REACTION_DELAY_MS;
  private blockHoldMs = 0;
  private repositionMs = 0;
  private holdRangeMs = 0;
  lastDecision = "watch";

  constructor(private readonly random: () => number = Math.random) {}

  update(context: ControllerContext): FighterIntent {
    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - context.deltaMs);
    this.rollCooldownMs = Math.max(0, this.rollCooldownMs - context.deltaMs);
    this.reactionMs = Math.max(0, this.reactionMs - context.deltaMs);
    this.blockHoldMs = Math.max(0, this.blockHoldMs - context.deltaMs);
    this.repositionMs = Math.max(0, this.repositionMs - context.deltaMs);
    this.holdRangeMs = Math.max(0, this.holdRangeMs - context.deltaMs);

    const distance = Math.abs(context.distanceX);
    const directionToOpponent = context.distanceX > 0 ? 1 : -1;
    const directionAway = directionToOpponent === 1 ? -1 : 1;
    const lowPosture = context.self.posture <= BOT_LOW_POSTURE_THRESHOLD;
    const opponentLowPosture = context.opponent.posture <= BOT_LOW_POSTURE_THRESHOLD;

    if (this.blockHoldMs > 0) {
      this.lastDecision = "hold-block";
      return { ...neutralIntent, block: true };
    }

    if (lowPosture && distance < BOT_LOW_POSTURE_RETREAT_RANGE && this.rollCooldownMs <= 0) {
      this.rollCooldownMs = BOT_ROLL_COOLDOWN_MS;
      this.lastDecision = "retreat-roll";
      return { ...neutralIntent, move: directionAway, roll: true };
    }

    if (lowPosture && distance < BOT_LOW_POSTURE_RETREAT_RANGE) {
      this.lastDecision = "guard-retreat";
      return { ...neutralIntent, move: directionAway, block: context.opponentIsAttacking };
    }

    if (context.opponentIsAttacking && this.reactionMs <= 0 && distance <= BOT_APPROACH_RANGE) {
      this.reactionMs = BOT_REACTION_DELAY_MS + this.random() * 120;
      if (this.random() < BOT_PARRY_CHANCE) {
        this.blockHoldMs = 260;
        this.lastDecision = "parry";
        return { ...neutralIntent, block: true };
      }
      if (this.random() < BOT_BLOCK_CHANCE) {
        this.blockHoldMs = 420;
        this.lastDecision = "block";
        return { ...neutralIntent, block: true };
      }
    }

    if (context.opponentIsRecovering && distance <= BOT_OPTIMAL_RANGE && this.attackCooldownMs <= 0) {
      if (this.random() < BOT_PUNISH_CHANCE) {
        this.setAttackCooldown();
        this.repositionMs = 220;
        this.lastDecision = "punish";
        return { ...neutralIntent, attack: true };
      }
      this.setHoldRange();
      this.lastDecision = "read";
      return neutralIntent;
    }

    if (distance > BOT_OPTIMAL_RANGE) {
      this.lastDecision = "approach";
      return { ...neutralIntent, move: directionToOpponent };
    }

    if (distance < BOT_TOO_CLOSE_RANGE) {
      if (this.attackCooldownMs <= 0 && this.random() < 0.35) {
        this.setAttackCooldown();
        this.repositionMs = 240;
        this.lastDecision = "close-poke";
        return { ...neutralIntent, attack: true };
      }
      this.lastDecision = "backstep";
      return { ...neutralIntent, move: directionAway };
    }

    if (this.repositionMs > 0) {
      this.lastDecision = "reposition";
      return { ...neutralIntent, move: directionAway };
    }

    if (distance <= BOT_OPTIMAL_RANGE && this.holdRangeMs > 0) {
      this.lastDecision = "read";
      return neutralIntent;
    }

    if (
      distance <= BOT_OPTIMAL_RANGE &&
      this.attackCooldownMs <= 0 &&
      this.holdRangeMs <= 0 &&
      this.random() < 0.45
    ) {
      this.setHoldRange();
      this.lastDecision = "read";
      return neutralIntent;
    }

    if ((distance <= BOT_OPTIMAL_RANGE || opponentLowPosture) && this.attackCooldownMs <= 0) {
      this.setAttackCooldown(opponentLowPosture ? 0.75 : 1);
      this.repositionMs = 180 + this.random() * 180;
      this.lastDecision = opponentLowPosture ? "pressure" : "attack";
      return { ...neutralIntent, attack: true };
    }

    this.lastDecision = "hold-range";
    return neutralIntent;
  }

  private setAttackCooldown(multiplier = 1): void {
    const range = BOT_ATTACK_COOLDOWN_MAX_MS - BOT_ATTACK_COOLDOWN_MIN_MS;
    this.attackCooldownMs = (BOT_ATTACK_COOLDOWN_MIN_MS + this.random() * range) * multiplier;
  }

  private setHoldRange(): void {
    const range = BOT_HOLD_RANGE_MAX_MS - BOT_HOLD_RANGE_MIN_MS;
    this.holdRangeMs = BOT_HOLD_RANGE_MIN_MS + this.random() * range;
  }
}
