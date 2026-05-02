import type { CombatRect } from "./types";

export function rectsOverlap(a: CombatRect, b: CombatRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
