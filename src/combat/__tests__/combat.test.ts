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
    expect(outcome.defender.posture).toBe(76);
  });

  it("parry damages attacker posture instead of defender posture", () => {
    const attacker = createFighter("attacker", "right");
    const defender = beginBlock(createFighter("defender", "left"));

    const outcome = resolveHit(attacker, defender, LIGHT_ATTACK);

    expect(outcome.result).toBe("parried");
    expect(outcome.attacker.posture).toBe(62);
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

  it("clean hits apply life damage, posture damage, and temporary hitstun", () => {
    const attacker = createFighter("attacker", "right");
    const defender = createFighter("defender", "left");

    const outcome = resolveHit(attacker, defender, LIGHT_ATTACK);

    expect(outcome.result).toBe("hit");
    expect(outcome.defender.life).toBe(90);
    expect(outcome.defender.posture).toBe(82);
    expect(outcome.defender.state).toBe("hitstun");

    const recovered = tickFighter(outcome.defender, 150);
    expect(recovered.state).toBe("idle");
  });

  it("parry window expires into held block", () => {
    const defender = beginBlock(createFighter("defender", "left"));

    const expired = tickFighter(defender, 126);

    expect(expired.state).toBe("block");
  });

  it("idle fighters recover posture over time", () => {
    const fighter = { ...createFighter("fighter", "right"), posture: 50 };

    const recovered = tickFighter(fighter, 1000);

    expect(recovered.posture).toBe(57);
  });
});
