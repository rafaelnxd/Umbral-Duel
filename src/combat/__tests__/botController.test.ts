import { describe, expect, it } from "vitest";
import { createFighter, enterState } from "../fighter";
import { BotController } from "../../game/controllers/BotController";
import { BOT_OPTIMAL_RANGE } from "../constants";

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
    expect(bot.lastDecision).toBe("approach");
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
    expect(bot.lastDecision).toBe("parry");
  });

  it("keeps approaching just outside real attack range", () => {
    const bot = new BotController(() => 0.9);
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
      distanceX: -(BOT_OPTIMAL_RANGE + 12),
      opponentIsAttacking: false,
      opponentIsRecovering: false,
      deltaMs: 16
    });

    expect(intent.move).toBe(-1);
    expect(intent.attack).toBe(false);
    expect(bot.lastDecision).toBe("approach");
  });

  it("attacks once inside real attack range", () => {
    const bot = new BotController(() => 0.9);
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

    expect(intent.attack).toBe(true);
    expect(bot.lastDecision).toBe("attack");
  });

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
    expect(bot.lastDecision).toBe("read");
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
    expect(bot.lastDecision).toBe("retreat-roll");
  });
});
