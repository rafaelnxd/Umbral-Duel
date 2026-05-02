import Phaser from "phaser";
import type { Fighter } from "../combat/types";

export interface HudBars {
  life: Phaser.GameObjects.Rectangle;
  posture: Phaser.GameObjects.Rectangle;
}

export function createHudBars(scene: Phaser.Scene, x: number, y: number, label: string): HudBars {
  scene.add.text(x, y - 22, label, {
    color: "#f0e6d2",
    fontFamily: "monospace",
    fontSize: "14px"
  });
  scene.add.rectangle(x + 50, y, 104, 12, 0x2b1517).setOrigin(0, 0.5);
  scene.add.rectangle(x + 50, y + 18, 104, 12, 0x171b2b).setOrigin(0, 0.5);
  return {
    life: scene.add.rectangle(x + 52, y, 100, 8, 0xb83232).setOrigin(0, 0.5),
    posture: scene.add.rectangle(x + 52, y + 18, 100, 8, 0xd7b84a).setOrigin(0, 0.5)
  };
}

export function updateHudBars(bars: HudBars, fighter: Fighter): void {
  bars.life.width = Math.max(0, 100 * (fighter.life / fighter.maxLife));
  bars.posture.width = Math.max(0, 100 * (fighter.posture / fighter.maxPosture));
}
