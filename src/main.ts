import Phaser from "phaser";
import { GameScene } from "./game/GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: 960,
  height: 540,
  backgroundColor: "#0f0b10",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1600, x: 0 },
      debug: false
    }
  },
  scene: [GameScene]
};

new Phaser.Game(config);
