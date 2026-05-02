# Combat Feel Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current `Vs Bot` duel feel more readable, responsive, and satisfying before adding menus, audio, or multiplayer.

**Architecture:** Keep deterministic combat logic in `src/combat` and keep Phaser-only presentation in `src/game`. Add small focused systems for combat tuning, hit stop, visual feedback, and bot decision quality without changing the calibrated arena, fighter scale, or sword hitbox unless a test or visual check proves it is necessary.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest.

---

## File Structure

- Modify: `src/combat/constants.ts` for combat tuning constants, bot tuning constants, and feedback timing constants.
- Modify: `src/combat/tickFighter.ts` only if stun/recovery behavior needs rules that belong to pure combat.
- Modify: `src/combat/resolveHit.ts` only if hit/block/parry numeric behavior changes.
- Modify: `src/combat/__tests__/combat.test.ts` to lock expected damage, posture, stun, and posture break behavior.
- Modify: `src/combat/__tests__/botController.test.ts` to lock bot spacing, punish, block, parry, and reposition behavior.
- Create: `src/game/FeedbackSystem.ts` for hit stop, screen shake, entity flash, and impact text/effects.
- Modify: `src/game/GameScene.ts` to delegate feedback to `FeedbackSystem` and keep scene code smaller.
- Modify: `src/game/CombatSystem.ts` only if combat events need richer metadata for feedback.
- Optional create: `public/assets/effects/block.png` if block needs a distinct bitmap effect.
- Optional create: `public/assets/effects/parry-burst.png` if parry needs a distinct bitmap effect.
- Modify: `src/game/assets.ts` if new effect assets are added.

## Scope

In scope:

- Tune life damage, posture damage, block damage, parry posture damage, parry window, roll invulnerability, hitstun, posture break stun, and posture recovery.
- Add short hit stop for hit, block, parry, and posture break.
- Improve visual feedback for hit, block, parry, and posture break.
- Make bot decisions less spammy and more readable while preserving challenge.
- Add tests for changed numeric combat behavior and bot decisions.
- Keep the current arena, fighter scale, and measured sword hitbox unchanged unless a specific issue appears during verification.

Out of scope:

- Online multiplayer.
- Main menu.
- Lobby/matchmaking.
- Sound implementation.
- New playable characters.
- New player sprite generation.

## Task 1: Lock Current Combat Numbers With Explicit Tests

**Files:**
- Modify: `src/combat/__tests__/combat.test.ts`
- Read: `src/combat/constants.ts`
- Read: `src/combat/resolveHit.ts`
- Read: `src/combat/tickFighter.ts`

- [ ] **Step 1: Add explicit tests for current hit and recovery behavior**

Add these tests to `src/combat/__tests__/combat.test.ts` below the existing tests:

```ts
it("clean hits apply life damage, posture damage, and temporary hitstun", () => {
  const attacker = createFighter("attacker", "right");
  const defender = createFighter("defender", "left");

  const outcome = resolveHit(attacker, defender, LIGHT_ATTACK);

  expect(outcome.result).toBe("hit");
  expect(outcome.defender.life).toBe(88);
  expect(outcome.defender.posture).toBe(84);
  expect(outcome.defender.state).toBe("hitstun");

  const recovered = tickFighter(outcome.defender, 180);
  expect(recovered.state).toBe("idle");
});

it("parry window expires into held block", () => {
  const defender = beginBlock(createFighter("defender", "left"));

  const expired = tickFighter(defender, 141);

  expect(expired.state).toBe("block");
});

it("idle fighters recover posture over time", () => {
  const fighter = { ...createFighter("fighter", "right"), posture: 50 };

  const recovered = tickFighter(fighter, 1000);

  expect(recovered.posture).toBe(59);
});
```

- [ ] **Step 2: Run combat tests**

Run:

```bash
npm.cmd test -- src/combat/__tests__/combat.test.ts
```

Expected: tests pass. If the exact values do not match current constants, update the test expectations to the current behavior before changing tuning.

- [ ] **Step 3: Commit current behavior lock**

Run:

```bash
git add src/combat/__tests__/combat.test.ts
git commit -m "test: lock combat baseline behavior"
```

## Task 2: Tune Core Combat Feel

**Files:**
- Modify: `src/combat/constants.ts`
- Modify: `src/combat/__tests__/combat.test.ts`

Initial tuning target:

```ts
export const LIGHT_ATTACK: AttackProfile = {
  lifeDamage: 10,
  postureDamage: 18,
  blockedLifeDamage: 1,
  blockedPostureDamage: 24,
  parriedPostureDamage: 38
};

export const POSTURE_BREAK_STUN_MS = 720;
export const HITSTUN_MS = 150;
export const PARRY_WINDOW_MS = 125;
export const ROLL_INVULNERABLE_MS = 165;
export const ROLL_DURATION_MS = 300;
export const POSTURE_RECOVERY_PER_SECOND = 7;
```

Reasoning:

- Slightly lower life damage keeps rounds from ending too abruptly.
- Slightly higher clean-hit posture damage makes offense matter even outside block.
- Slightly lower blocked posture damage reduces block from being punished too brutally.
- Higher parried posture damage makes parry feel valuable.
- Shorter hitstun keeps control responsive.
- Slightly shorter parry and roll invulnerability make timing more intentional.
- Slower posture recovery makes posture pressure meaningful.

- [ ] **Step 1: Update constants**

Apply the values listed above in `src/combat/constants.ts`.

- [ ] **Step 2: Update tests to match new intended behavior**

In `src/combat/__tests__/combat.test.ts`, update assertions:

```ts
expect(outcome.defender.life).toBe(99);
expect(outcome.defender.posture).toBe(76);
```

for blocked attacks.

Update parry posture assertion:

```ts
expect(outcome.attacker.posture).toBe(62);
```

Update clean hit assertions:

```ts
expect(outcome.defender.life).toBe(90);
expect(outcome.defender.posture).toBe(82);
```

Update hitstun recovery test to use `150`.

Update parry expiry test to use `126`.

Update posture recovery test:

```ts
expect(recovered.posture).toBe(57);
```

- [ ] **Step 3: Run combat tests**

Run:

```bash
npm.cmd test -- src/combat/__tests__/combat.test.ts
```

Expected: all combat tests pass.

- [ ] **Step 4: Run full tests**

Run:

```bash
npm.cmd test
```

Expected: 4 test files pass.

- [ ] **Step 5: Commit combat tuning**

Run:

```bash
git add src/combat/constants.ts src/combat/__tests__/combat.test.ts
git commit -m "tune: adjust core combat feel"
```

## Task 3: Extract FeedbackSystem

**Files:**
- Create: `src/game/FeedbackSystem.ts`
- Modify: `src/game/GameScene.ts`
- Modify: `src/game/CombatSystem.ts` only if required by TypeScript

- [ ] **Step 1: Create FeedbackSystem**

Create `src/game/FeedbackSystem.ts`:

```ts
import Phaser from "phaser";
import type { HitOutcome } from "../combat/types";
import { AssetKeys } from "./assets";
import type { FighterEntity } from "./FighterEntity";

export class FeedbackSystem {
  private hitStopMs = 0;

  constructor(private readonly scene: Phaser.Scene) {}

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
    this.scene.time.delayedCall(durationMs, () => entity.syncSilhouette());
  }
}
```

- [ ] **Step 2: Wire FeedbackSystem in GameScene**

In `src/game/GameScene.ts`, import and add a field:

```ts
import { FeedbackSystem } from "./FeedbackSystem";

private feedback!: FeedbackSystem;
```

Inside `create()`, after `this.hitboxGraphics`:

```ts
this.feedback = new FeedbackSystem(this);
```

At the top of `update`, after `this.syncGrounded()`:

```ts
this.feedback.update(deltaMs);
```

Before controller reads, if frozen:

```ts
if (this.feedback.isFrozen) {
  this.playerEntity.sprite.setVelocity(0, 0);
  this.botEntity.sprite.setVelocity(0, 0);
  this.syncVisuals();
  this.updateHud();
  this.updateDebugText();
  this.drawHitboxDebug();
  this.updateDebugProbe();
  return;
}
```

- [ ] **Step 3: Replace combat feedback in `handleCombatEvent`**

Replace the current hit/block/parry flash and shake logic with:

```ts
const defender = event.defenderId === this.playerEntity.id ? this.playerEntity : this.botEntity;
this.feedback.onCombatResult(event.result, defender, event.x, event.y, event.defenderPostureBroken);
```

Keep `handleCombatEvent` returning early for `"none"` and `"invulnerable"`.

- [ ] **Step 4: Remove old feedback helpers from GameScene**

Delete from `src/game/GameScene.ts` if no longer used:

```ts
private spawnEffect(...)
private flashEntity(...)
```

For death effect, either keep a small `spawnEffect` helper or add a `onRoundEnd` method to `FeedbackSystem`. Prefer adding this to `FeedbackSystem`:

```ts
onRoundEnd(x: number, y: number): void {
  this.spawnEffect(AssetKeys.postureBreak, x, y, 0xffd15c, 2, 320);
}
```

Then use it in `handleDeaths`.

- [ ] **Step 5: Build**

Run:

```bash
npm.cmd run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 6: Manual browser check**

Run or use the existing server at `http://127.0.0.1:5174/`.

Verify:

- Hit briefly freezes movement.
- Block creates blue spark.
- Parry creates stronger gold feedback.
- Posture break feels more dramatic.
- Characters still stand centered on the bridge.

- [ ] **Step 7: Commit feedback extraction**

Run:

```bash
git add src/game/FeedbackSystem.ts src/game/GameScene.ts
git commit -m "feat: add combat feedback system"
```

## Task 4: Improve Bot Decision Readability

**Files:**
- Modify: `src/game/controllers/BotController.ts`
- Modify: `src/combat/constants.ts`
- Modify: `src/combat/__tests__/botController.test.ts`

Target behavior:

- Bot should not attack immediately every time cooldown ends.
- Bot should sometimes hold range briefly before attacking.
- Bot should retreat more reliably when low posture.
- Bot should block more often than parry under pressure.
- Bot should punish recovery only when in real range.

- [ ] **Step 1: Add bot tuning constants**

In `src/combat/constants.ts`, add:

```ts
export const BOT_HOLD_RANGE_MIN_MS = 180;
export const BOT_HOLD_RANGE_MAX_MS = 420;
export const BOT_LOW_POSTURE_RETREAT_RANGE = 130;
export const BOT_PUNISH_CHANCE = 0.72;
```

- [ ] **Step 2: Add hold-range timer to BotController**

In `src/game/controllers/BotController.ts`, add field:

```ts
private holdRangeMs = 0;
```

Decrement it in `update`:

```ts
this.holdRangeMs = Math.max(0, this.holdRangeMs - context.deltaMs);
```

Add helper:

```ts
private setHoldRange(): void {
  const range = BOT_HOLD_RANGE_MAX_MS - BOT_HOLD_RANGE_MIN_MS;
  this.holdRangeMs = BOT_HOLD_RANGE_MIN_MS + this.random() * range;
}
```

- [ ] **Step 3: Make bot hold range before attacks**

Before the normal attack branch:

```ts
if (distance <= BOT_OPTIMAL_RANGE && this.holdRangeMs > 0) {
  this.lastDecision = "read";
  return neutralIntent;
}
```

When the bot first reaches range and `attackCooldownMs <= 0`, make it set a hold timer if no hold is active:

```ts
if (distance <= BOT_OPTIMAL_RANGE && this.attackCooldownMs <= 0 && this.holdRangeMs <= 0 && this.random() < 0.45) {
  this.setHoldRange();
  this.lastDecision = "read";
  return neutralIntent;
}
```

- [ ] **Step 4: Improve low-posture retreat**

Change low posture retreat condition to use `BOT_LOW_POSTURE_RETREAT_RANGE`:

```ts
if (lowPosture && distance < BOT_LOW_POSTURE_RETREAT_RANGE && this.rollCooldownMs <= 0) {
  ...
}
```

If roll cooldown is not ready:

```ts
if (lowPosture && distance < BOT_LOW_POSTURE_RETREAT_RANGE) {
  this.lastDecision = "guard-retreat";
  return { ...neutralIntent, move: directionAway, block: context.opponentIsAttacking };
}
```

- [ ] **Step 5: Add punish chance**

Change punish branch:

```ts
if (
  context.opponentIsRecovering &&
  distance <= BOT_OPTIMAL_RANGE &&
  this.attackCooldownMs <= 0 &&
  this.random() < BOT_PUNISH_CHANCE
) {
  ...
}
```

- [ ] **Step 6: Update bot tests**

Add tests in `src/combat/__tests__/botController.test.ts`:

```ts
it("sometimes reads at range before attacking", () => {
  const bot = new BotController(() => 0.2);
  bot.update({
    self: createFighter("bot", "left"),
    opponent: createFighter("player", "right"),
    distanceX: -240,
    opponentIsAttacking: false,
    opponentIsRecovering: false,
    deltaMs: 320
  });

  const intent = bot.update({
    self: createFighter("bot", "left"),
    opponent: createFighter("player", "right"),
    distanceX: -(BOT_OPTIMAL_RANGE - 4),
    opponentIsAttacking: false,
    opponentIsRecovering: false,
    deltaMs: 16
  });

  expect(intent.attack).toBe(false);
  expect(bot.lastDecision).toBe("read");
});

it("does not always punish recovery", () => {
  const bot = new BotController(() => 0.95);
  bot.update({
    self: createFighter("bot", "left"),
    opponent: createFighter("player", "right"),
    distanceX: -240,
    opponentIsAttacking: false,
    opponentIsRecovering: false,
    deltaMs: 320
  });

  const intent = bot.update({
    self: createFighter("bot", "left"),
    opponent: createFighter("player", "right"),
    distanceX: -(BOT_OPTIMAL_RANGE - 4),
    opponentIsAttacking: false,
    opponentIsRecovering: true,
    deltaMs: 16
  });

  expect(intent.attack).toBe(false);
});
```

- [ ] **Step 7: Run bot tests**

Run:

```bash
npm.cmd test -- src/combat/__tests__/botController.test.ts
```

Expected: bot tests pass.

- [ ] **Step 8: Run full tests and build**

Run:

```bash
npm.cmd test
npm.cmd run build
```

Expected: tests and build pass.

- [ ] **Step 9: Commit bot polish**

Run:

```bash
git add src/combat/constants.ts src/game/controllers/BotController.ts src/combat/__tests__/botController.test.ts
git commit -m "tune: improve bot decision pacing"
```

## Task 5: Add Manual Tuning Notes To README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add prototype tuning section**

Add this section after `Controls`:

```md
## Prototype Debugging

- Press `H` to toggle hitboxes.
- The red rectangle is the active sword hitbox.
- The blue rectangles are fighter hurtboxes.
- Debug text shows fighter states, posture, life, and current bot intent.

The current combat tuning is intentionally visible and testable. Before adding multiplayer, use the bot duel to evaluate parry timing, posture pressure, roll invulnerability, hitstun, and attack recovery.
```

- [ ] **Step 2: Run build**

Run:

```bash
npm.cmd run build
```

Expected: build passes.

- [ ] **Step 3: Commit README update**

Run:

```bash
git add README.md
git commit -m "docs: add combat tuning notes"
```

## Task 6: Final Verification And Push

**Files:**
- No code changes expected.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm.cmd test
npm.cmd run build
git status --short --branch
```

Expected:

- Tests pass.
- Build passes.
- Branch is ahead of `origin/main` by the new commits.
- No unstaged changes.

- [ ] **Step 2: Manual playtest checklist**

Open `http://127.0.0.1:5174/` and verify:

- Fighters are centered on the bridge.
- Hitbox still follows the sword slash.
- Normal hit is readable.
- Block is visually distinct.
- Parry is visually distinct and satisfying.
- Posture break is clear.
- Bot approaches, reads, attacks, blocks, parries, retreats, and punishes without feeling like a fixed loop.
- Rounds reset after win text.
- `R` still resets manually.
- `H` still toggles hitboxes.

- [ ] **Step 3: Push**

Run:

```bash
git push
```

Expected: commits are pushed to `origin/main`.

## Self-Review

Spec coverage:

- Combat tuning: Tasks 1 and 2.
- Feedback visual and hit stop: Task 3.
- Bot readability: Task 4.
- Documentation: Task 5.
- Verification and push: Task 6.

Placeholder scan:

- No open `TBD`, `TODO`, or unspecified implementation steps.

Type consistency:

- `FeedbackSystem` uses existing `FighterEntity`, `AssetKeys`, and `HitOutcome`.
- Bot tests use existing `createFighter`, `BotController`, and `BOT_OPTIMAL_RANGE`.
- New constants are defined before use.
