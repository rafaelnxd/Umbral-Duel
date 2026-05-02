import Phaser from "phaser";
import { getLightAttackPhase } from "../combat/attackState";
import { ROUND_RESET_DELAY_MS } from "../combat/constants";
import { tickFighter } from "../combat/tickFighter";
import type { FighterIntent } from "../combat/types";
import { AssetKeys, AssetPaths } from "./assets";
import { CombatSystem, type CombatEvent } from "./CombatSystem";
import { BotController } from "./controllers/BotController";
import { PlayerController } from "./controllers/PlayerController";
import type { ControllerContext } from "./controllers/types";
import { FighterEntity } from "./FighterEntity";
import { createHudBars, updateHudBars, type HudBars } from "./hud";

const FLOOR_Y = 390;
const PLAYER_START_X = 300;
const BOT_START_X = 640;
const FIGHTER_Y = FLOOR_Y - 64;
const PLAYER_SPEED = 260;
const JUMP_SPEED = -620;
const ROLL_SPEED = 460;

export class GameScene extends Phaser.Scene {
  private playerEntity!: FighterEntity;
  private botEntity!: FighterEntity;
  private combatSystem = new CombatSystem();
  private botController = new BotController();
  private keys!: Record<"left" | "right" | "jump" | "roll" | "reset" | "hitboxes", Phaser.Input.Keyboard.Key>;
  private pointerState = { attackQueued: false, blockHeld: false };
  private playerHud!: HudBars;
  private botHud!: HudBars;
  private debugText!: Phaser.GameObjects.Text;
  private footerText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private hitboxGraphics!: Phaser.GameObjects.Graphics;
  private showHitboxes = false;
  private spriteTest: string | null = null;
  private playerScore = 0;
  private botScore = 0;
  private roundOver = false;

  constructor() {
    super("GameScene");
  }

  preload(): void {
    this.load.spritesheet(AssetKeys.fighter, AssetPaths.fighter, {
      frameWidth: 420,
      frameHeight: 724
    });
    this.load.spritesheet(AssetKeys.dummy, AssetPaths.dummy, {
      frameWidth: 80,
      frameHeight: 128
    });
    this.load.image(AssetKeys.arena, AssetPaths.arena);
    this.load.image(AssetKeys.hit, AssetPaths.hit);
    this.load.image(AssetKeys.parry, AssetPaths.parry);
    this.load.image(AssetKeys.postureBreak, AssetPaths.postureBreak);
  }

  create(): void {
    this.spriteTest = new URLSearchParams(window.location.search).get("spriteTest");
    this.add.image(480, 270, AssetKeys.arena).setDisplaySize(960, 540);
    this.physics.world.setBounds(0, 0, 960, 540);
    this.createAnimations();

    const floor = this.add.rectangle(480, FLOOR_Y + 40, 960, 80, 0x211820, 0);
    this.physics.add.existing(floor, true);

    this.keys = {
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      roll: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      reset: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      hitboxes: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.H)
    };

    this.playerEntity = new FighterEntity(this, {
      id: "player",
      x: PLAYER_START_X,
      y: FIGHTER_Y,
      facing: "right",
      texture: AssetKeys.fighter,
      controller: new PlayerController(this.keys, this.pointerState)
    });
    this.botEntity = new FighterEntity(this, {
      id: "bot",
      x: BOT_START_X,
      y: FIGHTER_Y,
      facing: "left",
      texture: AssetKeys.fighter,
      controller: this.botController,
      tint: 0xd6b1ff
    });

    this.physics.add.collider(this.playerEntity.sprite, floor);
    this.physics.add.collider(this.botEntity.sprite, floor);
    this.physics.add.collider(this.playerEntity.sprite, this.botEntity.sprite);

    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.pointerState.attackQueued = true;
      if (pointer.rightButtonDown()) this.pointerState.blockHeld = true;
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonReleased()) this.pointerState.blockHeld = false;
    });

    this.playerHud = createHudBars(this, 24, 40, "Player");
    this.botHud = createHudBars(this, 720, 40, "Bot");
    this.debugText = this.add.text(24, 86, "", {
      color: "#d9cfbd",
      fontFamily: "monospace",
      fontSize: "14px"
    });
    this.footerText = this.add.text(
      24,
      500,
      "A/D move | Space jump | Shift roll | LMB attack | RMB block/parry | R reset | H hitboxes",
      {
        color: "#d9cfbd",
        fontFamily: "monospace",
        fontSize: "14px"
      }
    );
    this.scoreText = this.add
      .text(480, 32, "", {
        color: "#f0e6d2",
        fontFamily: "monospace",
        fontSize: "18px"
      })
      .setOrigin(0.5, 0.5);
    this.roundText = this.add
      .text(480, 170, "", {
        color: "#f7d37a",
        fontFamily: "monospace",
        fontSize: "28px",
        stroke: "#0a070a",
        strokeThickness: 4
      })
      .setOrigin(0.5, 0.5)
      .setDepth(30)
      .setVisible(false);
    this.updateScoreText();
    this.hitboxGraphics = this.add.graphics().setDepth(20);
  }

  update(_: number, deltaMs: number): void {
    this.syncGrounded();

    if (this.applySpriteTestMode(deltaMs)) {
      this.syncVisuals();
      this.updateHud();
      this.updateDebugText();
      this.updateDebugProbe();
      return;
    }

    this.handleReset();
    this.handleHitboxToggle();
    if (this.roundOver) {
      this.playerEntity.sprite.setVelocity(0, 0);
      this.botEntity.sprite.setVelocity(0, 0);
      this.syncVisuals();
      this.updateHud();
      this.updateDebugText();
      this.drawHitboxDebug();
      this.updateDebugProbe();
      return;
    }

    this.faceOpponents();

    const playerContext = this.createContext(this.playerEntity, this.botEntity, deltaMs);
    const botContext = this.createContext(this.botEntity, this.playerEntity, deltaMs);
    const playerIntent = this.playerEntity.controller.update(playerContext);
    const botIntent = this.botEntity.controller.update(botContext);

    this.playerEntity.applyIntent(playerIntent);
    this.botEntity.applyIntent(botIntent);

    this.applyMovement(this.playerEntity, playerIntent);
    this.applyMovement(this.botEntity, botIntent);

    this.playerEntity.model = tickFighter(this.playerEntity.model, deltaMs);
    this.botEntity.model = tickFighter(this.botEntity.model, deltaMs);

    this.handleCombatEvent(this.combatSystem.updateAttack(this.playerEntity, this.botEntity, deltaMs));
    this.handleCombatEvent(this.combatSystem.updateAttack(this.botEntity, this.playerEntity, deltaMs));
    this.handleDeaths();

    this.syncVisuals();
    this.updateHud();
    this.updateDebugText();
    this.drawHitboxDebug();
    this.updateDebugProbe();
  }

  private syncGrounded(): void {
    this.playerEntity.model.grounded = this.playerEntity.sprite.body.blocked.down;
    this.botEntity.model.grounded = this.botEntity.sprite.body.blocked.down;
  }

  private createContext(self: FighterEntity, opponent: FighterEntity, deltaMs: number): ControllerContext {
    return {
      self: self.model,
      opponent: opponent.model,
      distanceX: opponent.sprite.x - self.sprite.x,
      opponentIsAttacking: opponent.model.state === "attack",
      opponentIsRecovering: getLightAttackPhase(opponent.attackElapsedMs) === "recovery",
      deltaMs
    };
  }

  private handleReset(): void {
    if (!Phaser.Input.Keyboard.JustDown(this.keys.reset)) return;
    this.resetRound();
  }

  private resetRound(): void {
    this.pointerState.attackQueued = false;
    this.pointerState.blockHeld = false;
    this.roundOver = false;
    this.roundText.setVisible(false);
    this.playerEntity.reset(PLAYER_START_X, FIGHTER_Y, "right");
    this.botEntity.reset(BOT_START_X, FIGHTER_Y, "left");
    this.botController = new BotController();
    this.botEntity.setController(this.botController);
  }

  private handleHitboxToggle(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.hitboxes)) {
      this.showHitboxes = !this.showHitboxes;
    }
  }

  private faceOpponents(): void {
    if (this.canTurnFromInput(this.playerEntity.model.state)) {
      if (this.keys.left.isDown) {
        this.playerEntity.model.facing = "left";
      } else if (this.keys.right.isDown) {
        this.playerEntity.model.facing = "right";
      } else {
        this.playerEntity.model.facing = this.botEntity.sprite.x >= this.playerEntity.sprite.x ? "right" : "left";
      }
    }
    this.botEntity.model.facing = this.playerEntity.sprite.x >= this.botEntity.sprite.x ? "right" : "left";
  }

  private canTurnFromInput(state: string): boolean {
    return state === "idle" || state === "run" || state === "jump";
  }

  private applyMovement(entity: FighterEntity, intent: FighterIntent): void {
    const locked =
      entity.model.state === "attack" ||
      entity.model.state === "block" ||
      entity.model.state === "parry" ||
      entity.model.state === "hitstun" ||
      entity.model.state === "postureBroken";

    if (entity.model.state === "roll") {
      const direction = entity.model.facing === "right" ? 1 : -1;
      entity.sprite.setVelocityX(direction * ROLL_SPEED);
      return;
    }

    if (locked) {
      entity.sprite.setVelocityX(0);
      return;
    }

    entity.sprite.setVelocityX(intent.move * PLAYER_SPEED);

    if (intent.jump && entity.model.grounded) {
      entity.sprite.setVelocityY(JUMP_SPEED);
      entity.model.state = "jump";
      entity.model.stateTimeMs = 0;
      return;
    }

    if (entity.model.state === "idle" || entity.model.state === "run" || entity.model.state === "jump") {
      entity.model.state = intent.move === 0 ? "idle" : "run";
    }
  }

  private handleCombatEvent(event: CombatEvent): void {
    if (event.result === "none" || event.result === "invulnerable") return;

    const defender = event.defenderId === this.playerEntity.id ? this.playerEntity : this.botEntity;
    if (event.result === "hit") {
      this.spawnEffect(AssetKeys.hit, event.x, event.y, 0xffffff);
      this.flashEntity(defender, 0xff5c5c, 90);
      this.cameras.main.shake(70, 0.0025);
    } else if (event.result === "blocked") {
      this.spawnEffect(AssetKeys.hit, event.x, event.y, 0x8cc7ff);
      this.flashEntity(defender, 0x8cc7ff, 80);
    } else if (event.result === "parried") {
      this.spawnEffect(AssetKeys.parry, event.x, event.y, 0xfff1a8);
      this.flashEntity(defender, 0xfff1a8, 110);
      this.cameras.main.shake(95, 0.0035);
    }

    if (event.defenderPostureBroken) {
      this.spawnEffect(AssetKeys.postureBreak, event.x, event.y - 28, 0xffd15c);
      this.flashEntity(defender, 0xffd15c, 140);
    }
  }

  private handleDeaths(): void {
    if (this.roundOver || (this.playerEntity.model.life > 0 && this.botEntity.model.life > 0)) return;
    const playerWon = this.botEntity.model.life <= 0;
    if (playerWon) {
      this.playerScore += 1;
    } else {
      this.botScore += 1;
    }
    this.roundOver = true;
    this.updateScoreText();
    this.roundText.setText(playerWon ? "PLAYER WINS" : "BOT WINS").setVisible(true);
    this.spawnEffect(
      AssetKeys.postureBreak,
      this.playerEntity.model.life <= 0 ? this.playerEntity.sprite.x : this.botEntity.sprite.x,
      this.playerEntity.model.life <= 0 ? this.playerEntity.sprite.y - 52 : this.botEntity.sprite.y - 52
    );
    this.time.delayedCall(ROUND_RESET_DELAY_MS, () => this.resetRound());
  }

  private applySpriteTestMode(deltaMs: number): boolean {
    if (!this.spriteTest) return false;

    const stateByTest = {
      idle: "idle",
      run: "run",
      jump: "jump",
      attack: "attack",
      block: "block",
      parry: "parry",
      roll: "roll",
      stun: "postureBroken"
    } as const;

    const state = stateByTest[this.spriteTest as keyof typeof stateByTest];
    if (!state) return false;

    this.botEntity.sprite.setVisible(false);
    this.playerEntity.model = {
      ...this.playerEntity.model,
      state,
      facing: "right",
      grounded: this.spriteTest !== "jump",
      stateTimeMs: this.playerEntity.model.stateTimeMs + deltaMs
    };
    this.playerEntity.sprite.setPosition(320, this.spriteTest === "jump" ? FLOOR_Y - 150 : FIGHTER_Y);
    this.playerEntity.sprite.setVelocity(0, 0);
    return true;
  }

  private updateHud(): void {
    updateHudBars(this.playerHud, this.playerEntity.model);
    updateHudBars(this.botHud, this.botEntity.model);
  }

  private updateDebugText(): void {
    this.debugText.setText([
      `player: ${this.playerEntity.model.state} life ${Math.round(this.playerEntity.model.life)}/${this.playerEntity.model.maxLife} posture ${Math.round(this.playerEntity.model.posture)}/${this.playerEntity.model.maxPosture}`,
      `bot: ${this.botEntity.model.state} life ${Math.round(this.botEntity.model.life)}/${this.botEntity.model.maxLife} posture ${Math.round(this.botEntity.model.posture)}/${this.botEntity.model.maxPosture}`,
      `bot intent: ${this.botController.lastDecision}`,
      `hitboxes: ${this.showHitboxes ? "on" : "off"}`
    ]);
  }

  private spawnEffect(key: string, x: number, y: number, tint = 0xffffff): void {
    const effect = this.add.image(x, y, key).setDepth(10);
    effect.setTint(tint);
    this.tweens.add({
      targets: effect,
      alpha: 0,
      scale: 1.4,
      duration: 220,
      onComplete: () => effect.destroy()
    });
  }

  private flashEntity(entity: FighterEntity, tint: number, durationMs: number): void {
    entity.sprite.setTint(tint);
    this.time.delayedCall(durationMs, () => this.syncEntityVisual(entity));
  }

  private updateScoreText(): void {
    this.scoreText.setText(`Player ${this.playerScore}  -  ${this.botScore} Bot`);
  }

  private syncVisuals(): void {
    this.syncEntityVisual(this.playerEntity);
    this.syncEntityVisual(this.botEntity);
  }

  private syncEntityVisual(entity: FighterEntity): void {
    entity.sprite.setFlipX(entity.model.facing === "left");
    const defenseTint = entity.model.state === "block" || entity.model.state === "parry" ? 0x8cc7ff : entity.baseTint;
    const stunTint = entity.model.state === "postureBroken" ? 0xffd15c : defenseTint;
    entity.sprite.setTint(stunTint);
    this.playEntityAnimation(entity);
  }

  private createAnimations(): void {
    this.anims.create({
      key: "fighter-idle",
      frames: this.anims.generateFrameNumbers(AssetKeys.fighter, { frames: [0, 1] }),
      frameRate: 3,
      repeat: -1
    });
    this.anims.create({
      key: "fighter-run",
      frames: this.anims.generateFrameNumbers(AssetKeys.fighter, { frames: [2, 3] }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: "fighter-jump",
      frames: [{ key: AssetKeys.fighter, frame: 1 }],
      frameRate: 1
    });
    this.anims.create({
      key: "fighter-attack",
      frames: [{ key: AssetKeys.fighter, frame: 4 }],
      frameRate: 1
    });
    this.anims.create({
      key: "fighter-block",
      frames: [{ key: AssetKeys.fighter, frame: 5 }],
      frameRate: 1
    });
    this.anims.create({
      key: "fighter-parry",
      frames: [{ key: AssetKeys.fighter, frame: 6 }],
      frameRate: 1
    });
    this.anims.create({
      key: "fighter-roll",
      frames: [{ key: AssetKeys.fighter, frame: 7 }],
      frameRate: 1
    });
    this.anims.create({
      key: "fighter-stun",
      frames: [{ key: AssetKeys.fighter, frame: 8 }],
      frameRate: 1
    });
  }

  private playEntityAnimation(entity: FighterEntity): void {
    if (entity.model.state === "attack") {
      entity.sprite.anims.play("fighter-attack", true);
    } else if (entity.model.state === "parry") {
      entity.sprite.anims.play("fighter-parry", true);
    } else if (entity.model.state === "block") {
      entity.sprite.anims.play("fighter-block", true);
    } else if (entity.model.state === "roll") {
      entity.sprite.anims.play("fighter-roll", true);
    } else if (entity.model.state === "postureBroken" || entity.model.state === "hitstun") {
      entity.sprite.anims.play("fighter-stun", true);
    } else if (!entity.model.grounded || entity.model.state === "jump") {
      entity.sprite.anims.play("fighter-jump", true);
    } else if (entity.model.state === "run") {
      entity.sprite.anims.play("fighter-run", true);
    } else {
      entity.sprite.anims.play("fighter-idle", true);
    }
  }

  private drawHitboxDebug(): void {
    this.hitboxGraphics.clear();
    if (!this.showHitboxes) return;

    this.drawRect(this.combatSystem.getHurtbox(this.playerEntity), 0x54a8ff);
    this.drawRect(this.combatSystem.getHurtbox(this.botEntity), 0x54a8ff);
    if (this.playerEntity.model.state === "attack") {
      this.drawRect(this.combatSystem.getAttackRect(this.playerEntity), 0xff4055);
    }
    if (this.botEntity.model.state === "attack") {
      this.drawRect(this.combatSystem.getAttackRect(this.botEntity), 0xff4055);
    }
  }

  private drawRect(rect: { x: number; y: number; width: number; height: number }, color: number): void {
    this.hitboxGraphics.lineStyle(2, color, 0.9);
    this.hitboxGraphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }

  private updateDebugProbe(): void {
    const playerAnim = this.playerEntity.sprite.anims.currentAnim?.key ?? "none";
    const playerFrame = this.playerEntity.sprite.anims.currentFrame?.index ?? -1;
    const botAnim = this.botEntity.sprite.anims.currentAnim?.key ?? "none";
    const botFrame = this.botEntity.sprite.anims.currentFrame?.index ?? -1;
    (window as unknown as { __pvpDebug?: unknown }).__pvpDebug = {
      playerState: this.playerEntity.model.state,
      playerFacing: this.playerEntity.model.facing,
      playerGrounded: this.playerEntity.model.grounded,
      playerAnim,
      playerFrame,
      playerX: Math.round(this.playerEntity.sprite.x),
      playerY: Math.round(this.playerEntity.sprite.y),
      botState: this.botEntity.model.state,
      botPosture: Math.round(this.botEntity.model.posture),
      botLife: Math.round(this.botEntity.model.life),
      botAnim,
      botFrame,
      botX: Math.round(this.botEntity.sprite.x),
      botY: Math.round(this.botEntity.sprite.y),
      botIntent: this.botController.lastDecision,
      showHitboxes: this.showHitboxes
    };
  }
}
