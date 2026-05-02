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
