import Phaser from "phaser";
import type { HitOutcome } from "../combat/types";
import { AssetKeys } from "./assets";
import type { FighterEntity } from "./FighterEntity";

export class FeedbackSystem {
  private hitStopMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly restoreEntityVisual: (entity: FighterEntity) => void
  ) {}

  get isFrozen(): boolean {
    return this.hitStopMs > 0;
  }

  update(deltaMs: number): void {
    this.hitStopMs = Math.max(0, this.hitStopMs - deltaMs);
  }

  onCombatResult(
    result: HitOutcome["result"],
    defender: FighterEntity,
    x: number,
    y: number,
    postureBroken: boolean
  ): void {
    if (result === "invulnerable") return;

    if (result === "hit") {
      this.hitStopMs = 55;
      this.spawnEffect(AssetKeys.hit, x, y, 0xffffff, 1.35, 180);
      this.flashEntity(defender, 0xff5c5c, 90);
      this.scene.cameras.main.shake(70, 0.0025);
    } else if (result === "blocked") {
      this.hitStopMs = 35;
      this.spawnBlockSpark(x, y);
      this.flashEntity(defender, 0x8cc7ff, 80);
    } else if (result === "parried") {
      this.hitStopMs = 85;
      this.spawnEffect(AssetKeys.parry, x, y, 0xfff1a8, 1.75, 240);
      this.flashEntity(defender, 0xfff1a8, 120);
      this.scene.cameras.main.shake(95, 0.0035);
    }

    if (postureBroken) {
      this.hitStopMs = Math.max(this.hitStopMs, 110);
      this.spawnEffect(AssetKeys.postureBreak, x, y - 28, 0xffd15c, 1.9, 300);
      this.flashEntity(defender, 0xffd15c, 150);
    }
  }

  onRoundEnd(x: number, y: number): void {
    this.spawnEffect(AssetKeys.postureBreak, x, y, 0xffd15c, 2, 320);
  }

  private spawnBlockSpark(x: number, y: number): void {
    const ring = this.scene.add.circle(x, y, 10, 0x8cc7ff, 0.45).setDepth(11);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 2.2,
      duration: 160,
      onComplete: () => ring.destroy()
    });
  }

  private spawnEffect(
    key: string,
    x: number,
    y: number,
    tint: number,
    scale: number,
    duration: number
  ): void {
    const effect = this.scene.add.image(x, y, key).setDepth(10).setTint(tint);
    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      scale,
      duration,
      onComplete: () => effect.destroy()
    });
  }

  private flashEntity(entity: FighterEntity, tint: number, durationMs: number): void {
    entity.sprite.setTint(tint);
    this.scene.time.delayedCall(durationMs, () => this.restoreEntityVisual(entity));
  }
}
