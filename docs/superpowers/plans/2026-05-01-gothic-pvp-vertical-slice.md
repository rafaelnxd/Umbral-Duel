# Gothic PvP Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable Phaser vertical slice for a gothic pixel-art PvP combat prototype with one player, one training dummy, posture-focused combat, block/parry, jump, and roll.

**Architecture:** Create a Vite + TypeScript + Phaser app. Keep deterministic combat rules in pure TypeScript modules under `src/combat`, with Phaser-specific rendering/input in `src/game`. Use generated or hand-drawn temporary assets under `public/assets` while preserving the imagegen concept as reference material.

**Tech Stack:** TypeScript, Vite, Phaser 3, Vitest.

---

## File Structure

- `package.json`: npm scripts and dependencies.
- `index.html`: Vite entry HTML.
- `src/main.ts`: bootstraps Phaser.
- `src/game/GameScene.ts`: Phaser scene for arena, player, dummy, input, HUD, and effects.
- `src/game/assets.ts`: asset keys and paths.
- `src/game/hud.ts`: HUD rendering helpers.
- `src/combat/types.ts`: shared combat/state types.
- `src/combat/constants.ts`: movement, damage, posture, and timing values.
- `src/combat/fighter.ts`: fighter creation and state transition helpers.
- `src/combat/resolveHit.ts`: attack/block/parry/posture outcome rules.
- `src/combat/tickFighter.ts`: per-frame state timing, posture recovery, and stun expiry.
- `src/combat/__tests__/combat.test.ts`: Vitest coverage for combat rules.
- `public/assets/reference/gothic-swordsman-concept.png`: copied imagegen reference.
- `public/assets/sprites/fighter-placeholder.png`: initial readable generated-or-drawn sprite placeholder.
- `public/assets/sprites/dummy-placeholder.png`: dummy placeholder.
- `public/assets/arena/gothic-arena-placeholder.png`: initial arena placeholder.
- `public/assets/effects/*.png`: hit/parry/posture-break placeholder effects.

## Task 1: Scaffold The Phaser App

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/game/GameScene.ts`

- [ ] **Step 1: Create project package metadata**

Create `package.json`:

```json
{
  "name": "gothic-pvp-vertical-slice",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "phaser": "^3.90.0"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "typescript": "^5.8.3",
    "vite": "^6.3.4",
    "vitest": "^3.1.2"
  }
}
```

- [ ] **Step 2: Create TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create the HTML entry**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gothic PvP Vertical Slice</title>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Bootstrap Phaser**

Create `src/main.ts`:

```ts
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
```

- [ ] **Step 5: Create a temporary scene**

Create `src/game/GameScene.ts`:

```ts
import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create(): void {
    this.add.rectangle(480, 270, 960, 540, 0x120f14);
    this.add.rectangle(480, 440, 960, 80, 0x2a2026);
    this.add.text(24, 24, "Gothic PvP Vertical Slice", {
      color: "#f0e6d2",
      fontFamily: "monospace",
      fontSize: "20px"
    });
  }
}
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and dependencies install without errors.

- [ ] **Step 7: Verify build**

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 8: Commit if git is initialized**

Run: `git status --short`

Expected if git exists: new scaffold files are listed.

If git exists, run:

```bash
git add package.json package-lock.json tsconfig.json index.html src/main.ts src/game/GameScene.ts
git commit -m "chore: scaffold phaser vertical slice"
```

If git is not initialized, skip the commit and continue.

## Task 2: Add Pure Combat Model

**Files:**
- Create: `src/combat/types.ts`
- Create: `src/combat/constants.ts`
- Create: `src/combat/fighter.ts`
- Create: `src/combat/tickFighter.ts`
- Create: `src/combat/resolveHit.ts`
- Create: `src/combat/__tests__/combat.test.ts`

- [ ] **Step 1: Define combat types**

Create `src/combat/types.ts`:

```ts
export type Facing = "left" | "right";

export type FighterState =
  | "idle"
  | "run"
  | "jump"
  | "attack"
  | "block"
  | "parry"
  | "roll"
  | "hitstun"
  | "postureBroken";

export interface Fighter {
  id: string;
  life: number;
  maxLife: number;
  posture: number;
  maxPosture: number;
  state: FighterState;
  facing: Facing;
  stateTimeMs: number;
  invulnerableMs: number;
  grounded: boolean;
}

export interface AttackProfile {
  lifeDamage: number;
  postureDamage: number;
  blockedLifeDamage: number;
  blockedPostureDamage: number;
  parriedPostureDamage: number;
}

export interface HitOutcome {
  defender: Fighter;
  attacker: Fighter;
  result: "hit" | "blocked" | "parried" | "invulnerable";
}
```

- [ ] **Step 2: Define combat constants**

Create `src/combat/constants.ts`:

```ts
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
```

- [ ] **Step 3: Implement fighter creation and state changes**

Create `src/combat/fighter.ts`:

```ts
import { MAX_LIFE, MAX_POSTURE, PARRY_WINDOW_MS, ROLL_INVULNERABLE_MS } from "./constants";
import type { Facing, Fighter, FighterState } from "./types";

export function createFighter(id: string, facing: Facing): Fighter {
  return {
    id,
    life: MAX_LIFE,
    maxLife: MAX_LIFE,
    posture: MAX_POSTURE,
    maxPosture: MAX_POSTURE,
    state: "idle",
    facing,
    stateTimeMs: 0,
    invulnerableMs: 0,
    grounded: true
  };
}

export function enterState(fighter: Fighter, state: FighterState): Fighter {
  const next: Fighter = { ...fighter, state, stateTimeMs: 0 };
  if (state === "parry") {
    return next;
  }
  if (state === "roll") {
    return { ...next, invulnerableMs: ROLL_INVULNERABLE_MS };
  }
  return next;
}

export function beginBlock(fighter: Fighter): Fighter {
  return enterState(fighter, "parry");
}

export function isInParryWindow(fighter: Fighter): boolean {
  return fighter.state === "parry" && fighter.stateTimeMs <= PARRY_WINDOW_MS;
}
```

- [ ] **Step 4: Implement fighter ticking**

Create `src/combat/tickFighter.ts`:

```ts
import {
  POSTURE_BREAK_STUN_MS,
  POSTURE_RECOVERY_PER_SECOND,
  ROLL_DURATION_MS
} from "./constants";
import type { Fighter } from "./types";

export function tickFighter(fighter: Fighter, deltaMs: number): Fighter {
  const stateTimeMs = fighter.stateTimeMs + deltaMs;
  const invulnerableMs = Math.max(0, fighter.invulnerableMs - deltaMs);
  let next: Fighter = { ...fighter, stateTimeMs, invulnerableMs };

  if (next.state === "parry" && stateTimeMs > 140) {
    next = { ...next, state: "block" };
  }

  if (next.state === "roll" && stateTimeMs >= ROLL_DURATION_MS) {
    next = { ...next, state: "idle", stateTimeMs: 0 };
  }

  if (next.state === "postureBroken" && stateTimeMs >= POSTURE_BREAK_STUN_MS) {
    next = {
      ...next,
      state: "idle",
      stateTimeMs: 0,
      posture: Math.max(next.maxPosture * 0.35, next.posture)
    };
  }

  if (next.state === "idle" || next.state === "run" || next.state === "jump") {
    next = {
      ...next,
      posture: Math.min(
        next.maxPosture,
        next.posture + POSTURE_RECOVERY_PER_SECOND * (deltaMs / 1000)
      )
    };
  }

  return next;
}
```

- [ ] **Step 5: Implement hit resolution**

Create `src/combat/resolveHit.ts`:

```ts
import { HITSTUN_MS } from "./constants";
import { isInParryWindow } from "./fighter";
import type { AttackProfile, Fighter, HitOutcome } from "./types";

function applyPostureDamage(fighter: Fighter, postureDamage: number): Fighter {
  const posture = Math.max(0, fighter.posture - postureDamage);
  if (posture <= 0) {
    return { ...fighter, posture: 0, state: "postureBroken", stateTimeMs: 0 };
  }
  return { ...fighter, posture };
}

export function resolveHit(attacker: Fighter, defender: Fighter, attack: AttackProfile): HitOutcome {
  if (defender.invulnerableMs > 0 || defender.state === "roll") {
    return { attacker, defender, result: "invulnerable" };
  }

  if (isInParryWindow(defender)) {
    const nextAttacker = applyPostureDamage(attacker, attack.parriedPostureDamage);
    return { attacker: nextAttacker, defender, result: "parried" };
  }

  if (defender.state === "block") {
    const postureTarget = applyPostureDamage(defender, attack.blockedPostureDamage);
    return {
      attacker,
      defender: {
        ...postureTarget,
        life: Math.max(0, postureTarget.life - attack.blockedLifeDamage)
      },
      result: "blocked"
    };
  }

  const damaged = applyPostureDamage(defender, attack.postureDamage);
  return {
    attacker,
    defender: {
      ...damaged,
      life: Math.max(0, damaged.life - attack.lifeDamage),
      state: damaged.state === "postureBroken" ? "postureBroken" : "hitstun",
      stateTimeMs: 0
    },
    result: "hit"
  };
}
```

- [ ] **Step 6: Write combat tests**

Create `src/combat/__tests__/combat.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LIGHT_ATTACK, POSTURE_BREAK_STUN_MS } from "../constants";
import { beginBlock, createFighter, enterState } from "../fighter";
import { resolveHit } from "../resolveHit";
import { tickFighter } from "../tickFighter";

describe("combat rules", () => {
  it("blocked attacks deal tiny life damage and significant posture damage", () => {
    const attacker = createFighter("attacker", "right");
    const defender = enterState(createFighter("defender", "left"), "block");

    const outcome = resolveHit(attacker, defender, LIGHT_ATTACK);

    expect(outcome.result).toBe("blocked");
    expect(outcome.defender.life).toBe(99);
    expect(outcome.defender.posture).toBe(72);
  });

  it("parry damages attacker posture instead of defender posture", () => {
    const attacker = createFighter("attacker", "right");
    const defender = beginBlock(createFighter("defender", "left"));

    const outcome = resolveHit(attacker, defender, LIGHT_ATTACK);

    expect(outcome.result).toBe("parried");
    expect(outcome.attacker.posture).toBe(66);
    expect(outcome.defender.posture).toBe(100);
  });

  it("posture break puts target into a short stun state", () => {
    const attacker = createFighter("attacker", "right");
    const defender = { ...enterState(createFighter("defender", "left"), "block"), posture: 20 };

    const outcome = resolveHit(attacker, defender, LIGHT_ATTACK);

    expect(outcome.defender.state).toBe("postureBroken");
    expect(outcome.defender.posture).toBe(0);

    const recovered = tickFighter(outcome.defender, POSTURE_BREAK_STUN_MS);
    expect(recovered.state).toBe("idle");
    expect(recovered.posture).toBeGreaterThan(0);
  });

  it("roll invulnerability ignores incoming hits", () => {
    const attacker = createFighter("attacker", "right");
    const defender = enterState(createFighter("defender", "left"), "roll");

    const outcome = resolveHit(attacker, defender, LIGHT_ATTACK);

    expect(outcome.result).toBe("invulnerable");
    expect(outcome.defender.life).toBe(100);
    expect(outcome.defender.posture).toBe(100);
  });
});
```

- [ ] **Step 7: Run tests**

Run: `npm test`

Expected: all four combat tests pass.

- [ ] **Step 8: Commit if git is initialized**

Run:

```bash
git add src/combat package.json package-lock.json
git commit -m "feat: add posture combat rules"
```

If git is not initialized, skip the commit and continue.

## Task 3: Add Initial Visual Assets

**Files:**
- Create: `public/assets/reference/gothic-swordsman-concept.png`
- Create: `public/assets/sprites/fighter-placeholder.png`
- Create: `public/assets/sprites/dummy-placeholder.png`
- Create: `public/assets/arena/gothic-arena-placeholder.png`
- Create: `public/assets/effects/hit.png`
- Create: `public/assets/effects/parry.png`
- Create: `public/assets/effects/posture-break.png`
- Create: `src/game/assets.ts`

- [ ] **Step 1: Copy the generated concept into the project**

Find the generated swordsman image under:

```text
C:\Users\rafit\.codex\generated_images\019de227-7ef9-7741-a45e-3c97d460b14f
```

Copy the selected PNG to:

```text
public/assets/reference/gothic-swordsman-concept.png
```

Expected: the original generated image remains in `.codex/generated_images`, and the project has its own copy.

- [ ] **Step 2: Create placeholder sprite assets**

Create simple readable PNG assets at:

```text
public/assets/sprites/fighter-placeholder.png
public/assets/sprites/dummy-placeholder.png
public/assets/arena/gothic-arena-placeholder.png
public/assets/effects/hit.png
public/assets/effects/parry.png
public/assets/effects/posture-break.png
```

Use crisp pixel-art dimensions:

- Fighter: `96x128`.
- Dummy: `80x128`.
- Arena: `960x540`.
- Effects: `96x96`.

Expected: assets load cleanly in the browser and have no copyright dependency.

- [ ] **Step 3: Register asset keys**

Create `src/game/assets.ts`:

```ts
export const AssetKeys = {
  fighter: "fighter",
  dummy: "dummy",
  arena: "arena",
  hit: "hit",
  parry: "parry",
  postureBreak: "postureBreak"
} as const;

export const AssetPaths = {
  fighter: "assets/sprites/fighter-placeholder.png",
  dummy: "assets/sprites/dummy-placeholder.png",
  arena: "assets/arena/gothic-arena-placeholder.png",
  hit: "assets/effects/hit.png",
  parry: "assets/effects/parry.png",
  postureBreak: "assets/effects/posture-break.png"
} as const;
```

- [ ] **Step 4: Verify assets manually**

Run: `npm run dev`

Expected: Vite prints a local URL such as `http://127.0.0.1:5173/`.

Open the URL and verify no asset 404 errors appear in the browser console once Task 4 loads assets.

- [ ] **Step 5: Commit if git is initialized**

Run:

```bash
git add public/assets src/game/assets.ts
git commit -m "feat: add initial gothic visual assets"
```

If git is not initialized, skip the commit and continue.

## Task 4: Implement Playable Scene

**Files:**
- Modify: `src/game/GameScene.ts`
- Create: `src/game/hud.ts`

- [ ] **Step 1: Add HUD helper**

Create `src/game/hud.ts`:

```ts
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
```

- [ ] **Step 2: Replace the temporary scene with gameplay**

Modify `src/game/GameScene.ts`:

```ts
import Phaser from "phaser";
import { LIGHT_ATTACK } from "../combat/constants";
import { beginBlock, createFighter, enterState } from "../combat/fighter";
import { resolveHit } from "../combat/resolveHit";
import { tickFighter } from "../combat/tickFighter";
import type { Fighter } from "../combat/types";
import { AssetKeys, AssetPaths } from "./assets";
import { createHudBars, updateHudBars, type HudBars } from "./hud";

const FLOOR_Y = 440;
const PLAYER_SPEED = 260;
const JUMP_SPEED = -620;
const ROLL_SPEED = 460;
const ATTACK_RANGE = 112;
const ATTACK_ACTIVE_MS = 110;
const ATTACK_RECOVERY_MS = 340;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private dummy!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private playerModel!: Fighter;
  private dummyModel!: Fighter;
  private keys!: Record<"left" | "right" | "jump" | "roll", Phaser.Input.Keyboard.Key>;
  private playerHud!: HudBars;
  private dummyHud!: HudBars;
  private attackHasHit = false;

  constructor() {
    super("GameScene");
  }

  preload(): void {
    this.load.image(AssetKeys.fighter, AssetPaths.fighter);
    this.load.image(AssetKeys.dummy, AssetPaths.dummy);
    this.load.image(AssetKeys.arena, AssetPaths.arena);
    this.load.image(AssetKeys.hit, AssetPaths.hit);
    this.load.image(AssetKeys.parry, AssetPaths.parry);
    this.load.image(AssetKeys.postureBreak, AssetPaths.postureBreak);
  }

  create(): void {
    this.add.image(480, 270, AssetKeys.arena);
    this.physics.world.setBounds(0, 0, 960, 540);

    const floor = this.add.rectangle(480, FLOOR_Y + 40, 960, 80, 0x211820);
    this.physics.add.existing(floor, true);

    this.player = this.physics.add.sprite(300, FLOOR_Y - 64, AssetKeys.fighter);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(42, 116);
    this.player.body.setOffset(27, 12);

    this.dummy = this.physics.add.sprite(640, FLOOR_Y - 64, AssetKeys.dummy);
    this.dummy.setImmovable(true);
    this.dummy.body.setAllowGravity(true);
    this.dummy.body.setSize(42, 116);
    this.dummy.body.setOffset(19, 12);

    this.physics.add.collider(this.player, floor);
    this.physics.add.collider(this.dummy, floor);

    this.playerModel = createFighter("player", "right");
    this.dummyModel = createFighter("dummy", "left");

    this.keys = {
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      roll: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)
    };

    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.tryAttack();
      if (pointer.rightButtonDown()) this.playerModel = beginBlock(this.playerModel);
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonReleased() && (this.playerModel.state === "block" || this.playerModel.state === "parry")) {
        this.playerModel = enterState(this.playerModel, "idle");
      }
    });

    this.playerHud = createHudBars(this, 24, 40, "Player");
    this.dummyHud = createHudBars(this, 720, 40, "Dummy");

    this.add.text(24, 500, "A/D move  |  Space jump  |  Shift roll  |  LMB attack  |  RMB block/parry", {
      color: "#d9cfbd",
      fontFamily: "monospace",
      fontSize: "14px"
    });
  }

  update(_: number, deltaMs: number): void {
    this.playerModel = tickFighter(this.playerModel, deltaMs);
    this.dummyModel = tickFighter(this.dummyModel, deltaMs);
    this.syncGrounded();
    this.handleMovement();
    this.handleAttackWindow();
    this.syncVisuals();
    updateHudBars(this.playerHud, this.playerModel);
    updateHudBars(this.dummyHud, this.dummyModel);
  }

  private syncGrounded(): void {
    this.playerModel.grounded = this.player.body.blocked.down;
    this.dummyModel.grounded = this.dummy.body.blocked.down;
  }

  private handleMovement(): void {
    if (this.playerModel.state === "attack" || this.playerModel.state === "postureBroken") {
      this.player.setVelocityX(0);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.roll) && this.playerModel.grounded) {
      this.playerModel = enterState(this.playerModel, "roll");
    }

    if (this.playerModel.state === "roll") {
      const direction = this.playerModel.facing === "right" ? 1 : -1;
      this.player.setVelocityX(direction * ROLL_SPEED);
      return;
    }

    let velocityX = 0;
    if (this.keys.left.isDown) {
      velocityX = -PLAYER_SPEED;
      this.playerModel.facing = "left";
    } else if (this.keys.right.isDown) {
      velocityX = PLAYER_SPEED;
      this.playerModel.facing = "right";
    }
    this.player.setVelocityX(velocityX);

    if (Phaser.Input.Keyboard.JustDown(this.keys.jump) && this.playerModel.grounded) {
      this.player.setVelocityY(JUMP_SPEED);
      this.playerModel = enterState(this.playerModel, "jump");
    } else if (this.playerModel.state === "idle" || this.playerModel.state === "run" || this.playerModel.state === "jump") {
      this.playerModel.state = velocityX === 0 ? "idle" : "run";
    }
  }

  private tryAttack(): void {
    if (this.playerModel.state === "attack" || this.playerModel.state === "roll" || this.playerModel.state === "postureBroken") {
      return;
    }
    this.playerModel = enterState(this.playerModel, "attack");
    this.attackHasHit = false;
  }

  private handleAttackWindow(): void {
    if (this.playerModel.state !== "attack") return;

    const active = this.playerModel.stateTimeMs <= ATTACK_ACTIVE_MS;
    if (active && !this.attackHasHit && this.isDummyInAttackRange()) {
      const outcome = resolveHit(this.playerModel, this.dummyModel, LIGHT_ATTACK);
      this.playerModel = outcome.attacker;
      this.dummyModel = outcome.defender;
      this.attackHasHit = true;
      this.spawnEffect(outcome.result === "parried" ? AssetKeys.parry : AssetKeys.hit, this.dummy.x, this.dummy.y - 32);
      if (this.dummyModel.state === "postureBroken") {
        this.spawnEffect(AssetKeys.postureBreak, this.dummy.x, this.dummy.y - 60);
      }
    }

    if (this.playerModel.stateTimeMs >= ATTACK_RECOVERY_MS) {
      this.playerModel = enterState(this.playerModel, "idle");
    }
  }

  private isDummyInAttackRange(): boolean {
    const distance = Math.abs(this.dummy.x - this.player.x);
    const facingRightTarget = this.playerModel.facing === "right" && this.dummy.x >= this.player.x;
    const facingLeftTarget = this.playerModel.facing === "left" && this.dummy.x <= this.player.x;
    return distance <= ATTACK_RANGE && (facingRightTarget || facingLeftTarget);
  }

  private spawnEffect(key: string, x: number, y: number): void {
    const effect = this.add.image(x, y, key).setDepth(10);
    this.tweens.add({
      targets: effect,
      alpha: 0,
      scale: 1.4,
      duration: 220,
      onComplete: () => effect.destroy()
    });
  }

  private syncVisuals(): void {
    this.player.setFlipX(this.playerModel.facing === "left");
    this.player.setTint(this.playerModel.state === "block" || this.playerModel.state === "parry" ? 0x8cc7ff : 0xffffff);
    this.dummy.setTint(this.dummyModel.state === "postureBroken" ? 0xffd15c : 0xffffff);
  }
}
```

- [ ] **Step 3: Run typecheck/build**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 4: Manual browser test**

Run: `npm run dev`

Expected checks:

- `A/D` moves player.
- `Space` jumps.
- `Shift` rolls.
- Left click attacks and damages dummy.
- Right click tints player as blocking/parrying.
- Dummy life/posture HUD changes.
- Dummy posture break shows visible feedback.

- [ ] **Step 5: Commit if git is initialized**

Run:

```bash
git add src/game src/main.ts
git commit -m "feat: implement playable combat scene"
```

If git is not initialized, skip the commit and continue.

## Task 5: Polish Vertical Slice Feedback

**Files:**
- Modify: `src/game/GameScene.ts`
- Modify: `src/combat/constants.ts`
- Modify: `docs/superpowers/specs/2026-05-01-gothic-pvp-vertical-slice-design.md` if mechanics change during tuning.

- [ ] **Step 1: Tune constants after manual play**

Start from these values in `src/combat/constants.ts`:

```ts
export const LIGHT_ATTACK = {
  lifeDamage: 12,
  postureDamage: 16,
  blockedLifeDamage: 1,
  blockedPostureDamage: 28,
  parriedPostureDamage: 34
};

export const POSTURE_BREAK_STUN_MS = 650;
export const PARRY_WINDOW_MS = 140;
export const ROLL_INVULNERABLE_MS = 180;
```

Adjust only one group at a time:

- If parry is too easy, reduce `PARRY_WINDOW_MS` to `110`.
- If posture break is too frequent through normal attack spam, reduce `postureDamage` to `12`.
- If block is too weak, reduce `blockedPostureDamage` to `22`.
- If roll is too safe, reduce `ROLL_INVULNERABLE_MS` to `140`.

- [ ] **Step 2: Add state text for debug visibility**

In `src/game/GameScene.ts`, add debug text that shows:

```text
state: idle
posture: 100/100
```

Expected: while tuning, the current state and posture values are readable without opening devtools.

- [ ] **Step 3: Add dummy reset key**

Add `R` to reset dummy life/posture:

```ts
if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R))) {
  this.dummyModel = createFighter("dummy", "left");
}
```

Expected: pressing `R` restores dummy bars and clears stun.

- [ ] **Step 4: Re-run tests and build**

Run:

```bash
npm test
npm run build
```

Expected: tests and build pass.

- [ ] **Step 5: Commit if git is initialized**

Run:

```bash
git add src docs
git commit -m "feat: tune combat feedback"
```

If git is not initialized, skip the commit.

## Final Verification

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run dev`.
- [ ] Manually verify the control scheme: `A/D`, `Space`, `Shift`, left mouse, right mouse.
- [ ] Confirm blocked hits do little life damage but meaningful posture damage.
- [ ] Confirm posture break creates a short punish window.
- [ ] Confirm imagegen/reference assets are copied into `public/assets` and not referenced from `.codex/generated_images`.

## Self-Review

Spec coverage:

- Phaser web vertical slice: covered by Tasks 1 and 4.
- Gothic pixel-art visual direction and imagegen usage: covered by Task 3.
- Player vs dummy: covered by Task 4.
- Controls: covered by Task 4 and final verification.
- Life/posture, block, parry, roll, stun: covered by Tasks 2, 4, and 5.
- Automated combat tests: covered by Task 2.

Placeholder scan:

- No `TBD`, `TODO`, or undefined implementation placeholders are present.

Type consistency:

- `Fighter`, `FighterState`, `AttackProfile`, and `HitOutcome` are defined before use.
- `AssetKeys` and `AssetPaths` names match the scene imports.
- Test imports match file names created in the plan.
