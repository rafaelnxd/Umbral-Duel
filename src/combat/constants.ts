import type { AttackProfile } from "./types";

export const MAX_LIFE = 100;
export const MAX_POSTURE = 100;

export const LIGHT_ATTACK: AttackProfile = {
  lifeDamage: 12,
  postureDamage: 16,
  blockedLifeDamage: 1,
  blockedPostureDamage: 28,
  parriedPostureDamage: 34
};

export const POSTURE_BREAK_STUN_MS = 650;
export const HITSTUN_MS = 180;
export const PARRY_WINDOW_MS = 140;
export const ROLL_INVULNERABLE_MS = 180;
export const ROLL_DURATION_MS = 320;
export const POSTURE_RECOVERY_PER_SECOND = 9;

export const FIGHTER_SPRITE_SCALE = 0.364;

export const LIGHT_ATTACK_STARTUP_MS = 120;
export const LIGHT_ATTACK_ACTIVE_MS = 120;
export const LIGHT_ATTACK_RECOVERY_MS = 260;
export const LIGHT_ATTACK_TOTAL_MS =
  LIGHT_ATTACK_STARTUP_MS + LIGHT_ATTACK_ACTIVE_MS + LIGHT_ATTACK_RECOVERY_MS;

export const LIGHT_ATTACK_HITBOX = {
  xOffset: -12,
  width: 77,
  height: 31,
  verticalOffset: -50
};

export const FIGHTER_HURTBOX = {
  width: 56,
  height: 109,
  verticalOffset: -123
};

export const BOT_OPTIMAL_RANGE =
  LIGHT_ATTACK_HITBOX.xOffset + LIGHT_ATTACK_HITBOX.width + FIGHTER_HURTBOX.width / 2 - 6;
export const BOT_TOO_CLOSE_RANGE = 62;
export const BOT_APPROACH_RANGE = 170;
export const BOT_LOW_POSTURE_THRESHOLD = 35;
export const BOT_ATTACK_COOLDOWN_MIN_MS = 520;
export const BOT_ATTACK_COOLDOWN_MAX_MS = 860;
export const BOT_ROLL_COOLDOWN_MS = 1400;
export const BOT_REACTION_DELAY_MS = 220;
export const BOT_PARRY_CHANCE = 0.42;
export const BOT_BLOCK_CHANCE = 0.65;

export const ROUND_RESET_DELAY_MS = 1300;
