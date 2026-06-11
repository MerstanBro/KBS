import type { PavilionOrder } from "../types";

export function calcBestcase(
  pavilions: PavilionOrder[],
  maxLoad: number,
  warehouseX: number,
  warehouseY: number,
): number {
  let totalNeed = 0;
  const distances: number[] = [];

  for (const p of pavilions) {
    if (p.needed > p.delivered) {
      totalNeed += p.needed - p.delivered;
      distances.push(Math.abs(warehouseX - p.x) + Math.abs(warehouseY - p.y));
    }
  }

  if (totalNeed === 0) return 0;

  const trips = Math.ceil(totalNeed / maxLoad);
  distances.sort((a, b) => a - b);

  let cost = 0;
  for (let i = 0; i < Math.min(trips, distances.length); i++) {
    cost += distances[i]! * 2 + 2;
  }
  return cost;
}
