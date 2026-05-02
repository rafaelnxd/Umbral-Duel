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
