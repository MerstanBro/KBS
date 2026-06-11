import type { PavilionOrder } from "../types";

/**
 * True ceiling cost:
 * Start Dist + Sum(Round Trips) + Load/Unload Tax - Longest Return Trip
 */
export function calcStrictUpperBound(
  pavilions: PavilionOrder[],
  startX: number,
  startY: number,
  warehouseX: number,
  warehouseY: number,
): number {
  const uniquePositions = new Set<string>();
  for (const p of pavilions) {
    if (p.needed > 0) {
      uniquePositions.add(`${p.x},${p.y}`);
    }
  }

  const distances = [...uniquePositions].map((key) => {
    const [x, y] = key.split(",").map(Number);
    return Math.abs(warehouseX - x!) + Math.abs(warehouseY - y!);
  });

  const startDist = Math.abs(startX - warehouseX) + Math.abs(startY - warehouseY);
  const roundTrips = distances.reduce((sum, d) => sum + d * 2, 0);
  const actionTax = distances.length * 2;
  const longestDist = distances.length ? Math.max(...distances) : 0;

  return startDist + roundTrips + actionTax - longestDist;
}
