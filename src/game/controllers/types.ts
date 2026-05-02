import type { Fighter, FighterIntent } from "../../combat/types";

export interface ControllerContext {
  self: Fighter;
  opponent: Fighter;
  distanceX: number;
  opponentIsAttacking: boolean;
  opponentIsRecovering: boolean;
  deltaMs: number;
}

export interface FighterController {
  update(context: ControllerContext): FighterIntent;
}

export const neutralIntent: FighterIntent = {
  move: 0,
  jump: false,
  roll: false,
  attack: false,
  block: false
};
