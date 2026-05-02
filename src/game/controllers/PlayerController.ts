import Phaser from "phaser";
import type { FighterIntent } from "../../combat/types";
import type { ControllerContext, FighterController } from "./types";

export class PlayerController implements FighterController {
  constructor(
    private readonly keys: Record<"left" | "right" | "jump" | "roll", Phaser.Input.Keyboard.Key>,
    private readonly pointerState: { attackQueued: boolean; blockHeld: boolean }
  ) {}

  update(_: ControllerContext): FighterIntent {
    const move = this.keys.left.isDown ? -1 : this.keys.right.isDown ? 1 : 0;
    const intent: FighterIntent = {
      move,
      jump: Phaser.Input.Keyboard.JustDown(this.keys.jump),
      roll: Phaser.Input.Keyboard.JustDown(this.keys.roll),
      attack: this.pointerState.attackQueued,
      block: this.pointerState.blockHeld
    };
    this.pointerState.attackQueued = false;
    return intent;
  }
}
