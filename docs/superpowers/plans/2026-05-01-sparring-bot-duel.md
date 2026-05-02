# Sparring Bot Duel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the passive dummy with a competent sparring bot duel mode using shared fighter entities, real hitboxes, and reusable controller inputs.

**Architecture:** Keep combat rules testable in pure TypeScript and move Phaser-specific wiring into `src/game`. The scene should own entity creation and rendering, while `PlayerController` and `BotController` produce normalized fighter intents consumed by shared entity/combat systems. This preserves the future path to online multiplayer by making remote input another controller implementation.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest.

---

## File Structure

- Modify: `src/combat/types.ts` to add intents, attack phases, hitbox rectangles, and bot context types.
- Modify: `src/combat/constants.ts` to add timing, hitbox, and bot tuning constants.
- Create: `src/combat/geometry.ts` for rectangle overlap helpers.
- Create: `src/combat/attackState.ts` for startup/active/recovery timing helpers.
- Modify: `src/combat/resolveHit.ts` to keep existing block/parry/posture rules but support hitbox-driven calls.
- Create: `src/combat/__tests__/geometry.test.ts`.
- Create: `src/combat/__tests__/attackState.test.ts`.
- Create: `src/combat/__tests__/botController.test.ts`.
- Create: `src/game/controllers/types.ts` for `FighterIntent` and controller contracts.
- Create: `src/game/controllers/PlayerController.ts`.
- Create: `src/game/controllers/BotController.ts`.
- Create: `src/game/FighterEntity.ts`.
- Create: `src/game/CombatSystem.ts`.
- Modify: `src/game/GameScene.ts` to use two fighter entities instead of player/dummy special cases.
- Modify: `src/game/hud.ts` only if label/position changes are needed.

## Task 1: Add Shared Intent And Geometry Types

**Files:**
- Modify: `src/combat/types.ts`
- Create: `src/combat/geometry.ts`
- Create: `src/combat/__tests__/geometry.test.ts`

- [ ] **Step 1: Extend combat types**

Add these exports to `src/combat/types.ts`:

```ts
export interface FighterIntent {
  move: -1 | 0 | 1;
  jump: boolean;
  roll: boolean;
  attack: boolean;
  block: boolean;
}

export interface CombatRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AttackRuntime {
  attackId: number;
  elapsedMs: number;
  hasHitIds: Set<string>;
}

export type AttackPhase = "none" | "startup" | "active" | "recovery" | "complete";
```

- [ ] **Step 2: Add rectangle overlap helper**

Create `src/combat/geometry.ts`:

```ts
import type { CombatRect } from "./types";

export function rectsOverlap(a: CombatRect, b: CombatRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
```

- [ ] **Step 3: Add geometry tests**

Create `src/combat/__tests__/geometry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { rectsOverlap } from "../geometry";

describe("rectsOverlap", () => {
  it("returns true when rectangles overlap", () => {
    expect(
      rectsOverlap(
        { x: 10, y: 10, width: 20, height: 20 },
        { x: 25, y: 20, width: 20, height: 20 }
      )
    ).toBe(true);
  });

  it("returns false when rectangles are separated", () => {
    expect(
      rectsOverlap(
        { x: 10, y: 10, width: 20, height: 20 },
        { x: 40, y: 10, width: 20, height: 20 }
      )
    ).toBe(false);
  });

  it("returns false when edges only touch", () => {
    expect(
      rectsOverlap(
        { x: 10, y: 10, width: 20, height: 20 },
        { x: 30, y: 10, width: 20, height: 20 }
      )
    ).toBe(false);
  });
});
```

- [ ] **Step 4: Run geometry tests**

Run: `npm.cmd test -- src/combat/__tests__/geometry.test.ts`

Expected: 3 tests pass.

## Task 2: Add Attack Timing Helpers

**Files:**
- Modify: `src/combat/constants.ts`
- Create: `src/combat/attackState.ts`
- Create: `src/combat/__tests__/attackState.test.ts`

- [ ] **Step 1: Add attack timing constants**

Add to `src/combat/constants.ts`:

```ts
export const LIGHT_ATTACK_STARTUP_MS = 120;
export const LIGHT_ATTACK_ACTIVE_MS = 120;
export const LIGHT_ATTACK_RECOVERY_MS = 260;
export const LIGHT_ATTACK_TOTAL_MS =
  LIGHT_ATTACK_STARTUP_MS + LIGHT_ATTACK_ACTIVE_MS + LIGHT_ATTACK_RECOVERY_MS;

export const LIGHT_ATTACK_HITBOX = {
  forwardOffset: 34,
  width: 92,
  height: 70,
  verticalOffset: -82
};

export const FIGHTER_HURTBOX = {
  width: 54,
  height: 116,
  verticalOffset: -116
};
```

- [ ] **Step 2: Implement attack phase helper**

Create `src/combat/attackState.ts`:

```ts
import {
  LIGHT_ATTACK_ACTIVE_MS,
  LIGHT_ATTACK_RECOVERY_MS,
  LIGHT_ATTACK_STARTUP_MS,
  LIGHT_ATTACK_TOTAL_MS
} from "./constants";
import type { AttackPhase } from "./types";

export function getLightAttackPhase(elapsedMs: number): AttackPhase {
  if (elapsedMs < 0) return "none";
  if (elapsedMs < LIGHT_ATTACK_STARTUP_MS) return "startup";
  if (elapsedMs < LIGHT_ATTACK_STARTUP_MS + LIGHT_ATTACK_ACTIVE_MS) return "active";
  if (elapsedMs < LIGHT_ATTACK_TOTAL_MS) return "recovery";
  return "complete";
}

export function isAttackRecovering(elapsedMs: number): boolean {
  return getLightAttackPhase(elapsedMs) === "recovery";
}
```

- [ ] **Step 3: Add attack phase tests**

Create `src/combat/__tests__/attackState.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  LIGHT_ATTACK_ACTIVE_MS,
  LIGHT_ATTACK_STARTUP_MS,
  LIGHT_ATTACK_TOTAL_MS
} from "../constants";
import { getLightAttackPhase, isAttackRecovering } from "../attackState";

describe("light attack phases", () => {
  it("starts in startup", () => {
    expect(getLightAttackPhase(0)).toBe("startup");
  });

  it("becomes active after startup", () => {
    expect(getLightAttackPhase(LIGHT_ATTACK_STARTUP_MS)).toBe("active");
  });

  it("enters recovery after active frames", () => {
    expect(getLightAttackPhase(LIGHT_ATTACK_STARTUP_MS + LIGHT_ATTACK_ACTIVE_MS)).toBe("recovery");
  });

  it("completes after total duration", () => {
    expect(getLightAttackPhase(LIGHT_ATTACK_TOTAL_MS)).toBe("complete");
  });

  it("detects recovery", () => {
    expect(isAttackRecovering(LIGHT_ATTACK_STARTUP_MS + LIGHT_ATTACK_ACTIVE_MS + 1)).toBe(true);
  });
});
```

- [ ] **Step 4: Run attack tests**

Run: `npm.cmd test -- src/combat/__tests__/attackState.test.ts`

Expected: 5 tests pass.

## Task 3: Create Controller Contracts

**Files:**
- Create: `src/game/controllers/types.ts`
- Create: `src/game/controllers/PlayerController.ts`

- [ ] **Step 1: Create controller types**

Create `src/game/controllers/types.ts`:

```ts
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
```

- [ ] **Step 2: Create player controller**

Create `src/game/controllers/PlayerController.ts`:

```ts
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
```

- [ ] **Step 3: Run build**

Run: `npm.cmd run build`

Expected: build passes.

## Task 4: Create Smarter Bot Controller

**Files:**
- Modify: `src/combat/constants.ts`
- Create: `src/game/controllers/BotController.ts`
- Create: `src/combat/__tests__/botController.test.ts`

- [ ] **Step 1: Add bot tuning constants**

Add to `src/combat/constants.ts`:

```ts
export const BOT_OPTIMAL_RANGE = 118;
export const BOT_TOO_CLOSE_RANGE = 58;
export const BOT_APPROACH_RANGE = 170;
export const BOT_LOW_POSTURE_THRESHOLD = 35;
export const BOT_ATTACK_COOLDOWN_MS = 560;
export const BOT_ROLL_COOLDOWN_MS = 1400;
export const BOT_REACTION_DELAY_MS = 220;
export const BOT_PARRY_CHANCE = 0.42;
export const BOT_BLOCK_CHANCE = 0.65;
```

- [ ] **Step 2: Implement bot controller**

Create `src/game/controllers/BotController.ts`:

```ts
import {
  BOT_APPROACH_RANGE,
  BOT_ATTACK_COOLDOWN_MS,
  BOT_BLOCK_CHANCE,
  BOT_LOW_POSTURE_THRESHOLD,
  BOT_OPTIMAL_RANGE,
  BOT_PARRY_CHANCE,
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

  constructor(private readonly random: () => number = Math.random) {}

  update(context: ControllerContext): FighterIntent {
    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - context.deltaMs);
    this.rollCooldownMs = Math.max(0, this.rollCooldownMs - context.deltaMs);
    this.reactionMs = Math.max(0, this.reactionMs - context.deltaMs);
    this.blockHoldMs = Math.max(0, this.blockHoldMs - context.deltaMs);

    const distance = Math.abs(context.distanceX);
    const directionToOpponent = context.distanceX > 0 ? 1 : -1;
    const lowPosture = context.self.posture <= BOT_LOW_POSTURE_THRESHOLD;
    const opponentLowPosture = context.opponent.posture <= BOT_LOW_POSTURE_THRESHOLD;

    if (this.blockHoldMs > 0) {
      return { ...neutralIntent, block: true };
    }

    if (lowPosture && distance < BOT_APPROACH_RANGE && this.rollCooldownMs <= 0) {
      this.rollCooldownMs = BOT_ROLL_COOLDOWN_MS;
      return { ...neutralIntent, move: directionToOpponent === 1 ? -1 : 1, roll: true };
    }

    if (context.opponentIsAttacking && this.reactionMs <= 0 && distance <= BOT_APPROACH_RANGE) {
      this.reactionMs = BOT_REACTION_DELAY_MS;
      if (this.random() < BOT_PARRY_CHANCE) {
        this.blockHoldMs = 260;
        return { ...neutralIntent, block: true };
      }
      if (this.random() < BOT_BLOCK_CHANCE) {
        this.blockHoldMs = 420;
        return { ...neutralIntent, block: true };
      }
    }

    if (context.opponentIsRecovering && distance <= BOT_OPTIMAL_RANGE && this.attackCooldownMs <= 0) {
      this.attackCooldownMs = BOT_ATTACK_COOLDOWN_MS;
      return { ...neutralIntent, attack: true };
    }

    if (distance > BOT_APPROACH_RANGE) {
      return { ...neutralIntent, move: directionToOpponent };
    }

    if (distance < BOT_TOO_CLOSE_RANGE) {
      return { ...neutralIntent, move: directionToOpponent === 1 ? -1 : 1 };
    }

    if ((distance <= BOT_OPTIMAL_RANGE || opponentLowPosture) && this.attackCooldownMs <= 0) {
      this.attackCooldownMs = opponentLowPosture ? BOT_ATTACK_COOLDOWN_MS * 0.75 : BOT_ATTACK_COOLDOWN_MS;
      return { ...neutralIntent, attack: true };
    }

    return neutralIntent;
  }
}
```

- [ ] **Step 3: Add bot controller tests**

Create `src/combat/__tests__/botController.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createFighter, enterState } from "../fighter";
import { BotController } from "../../game/controllers/BotController";

describe("BotController", () => {
  it("approaches when far away", () => {
    const bot = new BotController(() => 0.9);
    const intent = bot.update({
      self: createFighter("bot", "left"),
      opponent: createFighter("player", "right"),
      distanceX: -240,
      opponentIsAttacking: false,
      opponentIsRecovering: false,
      deltaMs: 16
    });
    expect(intent.move).toBe(-1);
  });

  it("blocks when opponent attacks and parry roll succeeds", () => {
    const bot = new BotController(() => 0.1);
    const intent = bot.update({
      self: createFighter("bot", "left"),
      opponent: enterState(createFighter("player", "right"), "attack"),
      distanceX: -100,
      opponentIsAttacking: true,
      opponentIsRecovering: false,
      deltaMs: 240
    });
    expect(intent.block).toBe(true);
  });

  it("retreats with roll when posture is low and roll cooldown is ready", () => {
    const bot = new BotController(() => 0.9);
    bot.update({
      self: createFighter("bot", "left"),
      opponent: createFighter("player", "right"),
      distanceX: -80,
      opponentIsAttacking: false,
      opponentIsRecovering: false,
      deltaMs: 1600
    });
    const intent = bot.update({
      self: { ...createFighter("bot", "left"), posture: 20 },
      opponent: createFighter("player", "right"),
      distanceX: -80,
      opponentIsAttacking: false,
      opponentIsRecovering: false,
      deltaMs: 16
    });
    expect(intent.roll).toBe(true);
    expect(intent.move).toBe(1);
  });
});
```

- [ ] **Step 4: Run bot tests**

Run: `npm.cmd test -- src/combat/__tests__/botController.test.ts`

Expected: 3 tests pass.

## Task 5: Create FighterEntity

**Files:**
- Create: `src/game/FighterEntity.ts`
- Modify: `src/game/GameScene.ts`

- [ ] **Step 1: Implement FighterEntity**

Create `src/game/FighterEntity.ts`:

```ts
import Phaser from "phaser";
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
}

export class FighterEntity {
  model: Fighter;
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  attackId = 0;
  attackElapsedMs = 0;
  hitIds = new Set<string>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: FighterEntityConfig
  ) {
    this.model = createFighter(config.id, config.facing);
    this.sprite = scene.physics.add.sprite(config.x, config.y, config.texture);
    this.sprite.setScale(0.18);
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

  applyIntent(intent: FighterIntent): void {
    if (intent.attack && this.model.state !== "attack" && this.model.state !== "roll" && this.model.state !== "postureBroken") {
      this.attackId += 1;
      this.attackElapsedMs = 0;
      this.hitIds.clear();
      this.model = enterState(this.model, "attack");
    }

    if (intent.block && this.model.state !== "block" && this.model.state !== "parry" && this.model.state !== "attack") {
      this.model = enterState(this.model, "parry");
    }

    if (!intent.block && (this.model.state === "block" || this.model.state === "parry")) {
      this.model = enterState(this.model, "idle");
    }
  }
}
```

- [ ] **Step 2: Build after entity creation**

Run: `npm.cmd run build`

Expected: build passes before wiring the entity into the scene.

## Task 6: Add CombatSystem With Hitboxes

**Files:**
- Create: `src/game/CombatSystem.ts`
- Modify: `src/game/GameScene.ts`

- [ ] **Step 1: Implement CombatSystem**

Create `src/game/CombatSystem.ts`:

```ts
import {
  FIGHTER_HURTBOX,
  LIGHT_ATTACK,
  LIGHT_ATTACK_HITBOX,
  LIGHT_ATTACK_TOTAL_MS
} from "../combat/constants";
import { getLightAttackPhase } from "../combat/attackState";
import { rectsOverlap } from "../combat/geometry";
import { resolveHit } from "../combat/resolveHit";
import type { CombatRect } from "../combat/types";
import { FighterEntity } from "./FighterEntity";

export class CombatSystem {
  updateAttack(attacker: FighterEntity, defender: FighterEntity, deltaMs: number): "none" | "hit" | "blocked" | "parried" | "invulnerable" {
    if (attacker.model.state !== "attack") return "none";

    attacker.attackElapsedMs += deltaMs;
    const phase = getLightAttackPhase(attacker.attackElapsedMs);
    if (phase === "complete" || attacker.attackElapsedMs >= LIGHT_ATTACK_TOTAL_MS) {
      attacker.model.state = "idle";
      attacker.model.stateTimeMs = 0;
      return "none";
    }

    if (phase !== "active" || attacker.hitIds.has(defender.id)) return "none";

    const attackRect = this.getAttackRect(attacker);
    const hurtRect = this.getHurtbox(defender);
    if (!rectsOverlap(attackRect, hurtRect)) return "none";

    const outcome = resolveHit(attacker.model, defender.model, LIGHT_ATTACK);
    attacker.model = outcome.attacker;
    defender.model = outcome.defender;
    attacker.hitIds.add(defender.id);
    return outcome.result;
  }

  getHurtbox(entity: FighterEntity): CombatRect {
    return {
      x: entity.sprite.x - FIGHTER_HURTBOX.width / 2,
      y: entity.sprite.y + FIGHTER_HURTBOX.verticalOffset,
      width: FIGHTER_HURTBOX.width,
      height: FIGHTER_HURTBOX.height
    };
  }

  getAttackRect(entity: FighterEntity): CombatRect {
    const direction = entity.model.facing === "right" ? 1 : -1;
    const x = direction === 1
      ? entity.sprite.x + LIGHT_ATTACK_HITBOX.forwardOffset
      : entity.sprite.x - LIGHT_ATTACK_HITBOX.forwardOffset - LIGHT_ATTACK_HITBOX.width;
    return {
      x,
      y: entity.sprite.y + LIGHT_ATTACK_HITBOX.verticalOffset,
      width: LIGHT_ATTACK_HITBOX.width,
      height: LIGHT_ATTACK_HITBOX.height
    };
  }
}
```

- [ ] **Step 2: Build after CombatSystem**

Run: `npm.cmd run build`

Expected: build passes.

## Task 7: Wire Player Versus Bot In GameScene

**Files:**
- Modify: `src/game/GameScene.ts`

- [ ] **Step 1: Replace dummy-specific state with two FighterEntity instances**

Refactor `GameScene` so it owns:

```ts
private playerEntity!: FighterEntity;
private botEntity!: FighterEntity;
private combatSystem = new CombatSystem();
private pointerState = { attackQueued: false, blockHeld: false };
```

Use `PlayerController` for `playerEntity` and `BotController` for `botEntity`.

- [ ] **Step 2: Preserve current controls**

Mouse and keyboard should still mean:

```ts
left mouse down -> pointerState.attackQueued = true
right mouse down -> pointerState.blockHeld = true
right mouse up -> pointerState.blockHeld = false
A/D -> move
Space -> jump
Shift -> roll
R -> reset round
```

- [ ] **Step 3: Update both entities each frame**

For each entity:

1. Build controller context.
2. Read intent.
3. Apply intent.
4. Apply movement.
5. Tick fighter state.
6. Sync animation.

Then run:

```ts
this.combatSystem.updateAttack(this.playerEntity, this.botEntity, deltaMs);
this.combatSystem.updateAttack(this.botEntity, this.playerEntity, deltaMs);
```

- [ ] **Step 4: Add basic bot movement and facing**

The bot should face the player every frame. Movement uses the same speed as the player at first, then can be tuned down if needed.

- [ ] **Step 5: Add reset round**

`R` should restore both fighters:

```ts
player at x=300
bot at x=640
both life=100
both posture=100
both state=idle
```

- [ ] **Step 6: Build**

Run: `npm.cmd run build`

Expected: build passes and the browser loads a player-vs-bot duel.

## Task 8: Add Debug Feedback And Manual Verification

**Files:**
- Modify: `src/game/GameScene.ts`

- [ ] **Step 1: Add bot debug text**

Show:

```text
player: state/posture/life
bot: state/posture/life
bot intent: approach/block/attack/retreat
```

The bot intent can be a string field stored by `BotController`, such as `lastDecision`.

- [ ] **Step 2: Add temporary hitbox debug toggle**

Add key `H` to toggle drawing attack/hurt rectangles. Use Phaser rectangles with transparent fills:

```ts
attack hitbox: red outline
hurtbox: blue outline
```

- [ ] **Step 3: Manual test checklist**

Run: `npm.cmd run build`, then serve the game and verify:

- Bot approaches from far range.
- Bot stops near sword range.
- Bot attacks when in range.
- Bot sometimes blocks/parries player attacks.
- Bot does not parry every attack.
- Bot retreats or rolls when its posture is low.
- Player can damage bot.
- Bot can damage player.
- Posture break creates punish window.
- `R` resets both fighters.

- [ ] **Step 4: Run full tests**

Run:

```bash
npm.cmd test
npm.cmd run build
```

Expected: tests and build pass.

## Self-Review

Spec coverage:

- Shared fighter architecture: Tasks 1, 3, 5, and 7.
- Smarter bot behavior: Task 4 and Task 8.
- Real hitbox/hurtbox combat: Tasks 1, 2, and 6.
- Player-vs-bot playable mode: Task 7.
- Debug visibility and verification: Task 8.
- Future multiplayer-friendly controller model: Tasks 3 and 5.

Placeholder scan:

- No `TBD`, `TODO`, or open implementation placeholders are present.

Type consistency:

- `FighterIntent`, `CombatRect`, `AttackPhase`, and `AttackRuntime` are defined before use.
- `BotController` imports constants defined in Task 4.
- `CombatSystem` consumes `FighterEntity`, `AttackPhase`, and existing `resolveHit` outputs consistently.
