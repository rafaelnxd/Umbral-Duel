import Phaser from "phaser";
import { FIGHTER_SPRITE_SCALE } from "../combat/constants";
import { createFighter, enterState } from "../combat/fighter";
import type { Facing, Fighter, FighterIntent } from "../combat/types";
import type { FighterController } from "./controllers/types";

export interface FighterEntityConfig {
  id: string;
  x: number;
  y: number;
  facing: Facing;
  texture: string;
  controller: FighterController;
  tint?: number;
}

export class FighterEntity {
  model: Fighter;
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  attackId = 0;
  attackElapsedMs = 0;
  hitIds = new Set<string>();
  readonly baseTint: number;

  constructor(scene: Phaser.Scene, private readonly config: FighterEntityConfig) {
    this.model = createFighter(config.id, config.facing);
    this.baseTint = config.tint ?? 0xffffff;
    this.sprite = scene.physics.add.sprite(config.x, config.y, config.texture);
    this.sprite.setScale(FIGHTER_SPRITE_SCALE);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setSize(120, 620);
    this.sprite.body.setOffset(150, 90);
  }

  get id(): string {
    return this.model.id;
  }

  get controller(): FighterController {
    return this.config.controller;
  }

  setController(controller: FighterController): void {
    this.config.controller = controller;
  }

  applyIntent(intent: FighterIntent): void {
    const locked =
      this.model.state === "attack" ||
      this.model.state === "roll" ||
      this.model.state === "hitstun" ||
      this.model.state === "postureBroken";

    if (intent.attack && !locked && this.model.state !== "block" && this.model.state !== "parry") {
      this.attackId += 1;
      this.attackElapsedMs = 0;
      this.hitIds.clear();
      this.model = enterState(this.model, "attack");
      return;
    }

    if (intent.roll && !locked && this.model.grounded) {
      this.model = enterState(this.model, "roll");
      return;
    }

    if (intent.block && !locked && this.model.state !== "jump") {
      if (this.model.state !== "block" && this.model.state !== "parry") {
        this.model = enterState(this.model, "parry");
      }
      return;
    }

    if (!intent.block && (this.model.state === "block" || this.model.state === "parry")) {
      this.model = enterState(this.model, "idle");
    }
  }

  reset(x: number, y: number, facing: Facing): void {
    this.model = createFighter(this.id, facing);
    this.attackElapsedMs = 0;
    this.hitIds.clear();
    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
  }
}
