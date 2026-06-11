import { uniquePavilionSites } from "../flowers";
import type { PavilionOrder, PavilionSite } from "../types";

export function getPavilionSites(pavilions: PavilionOrder[]): PavilionSite[] {
  return uniquePavilionSites(pavilions);
}

export function getSiteOrders(pavilions: PavilionOrder[], pid: number): PavilionOrder[] {
  return pavilions.filter((p) => p.pid === pid);
}

export function nextPavilionId(pavilions: PavilionOrder[]): number {
  if (pavilions.length === 0) return 1;
  return Math.max(...pavilions.map((p) => p.pid)) + 1;
}

export function pavilionAtCell(pavilions: PavilionOrder[], x: number, y: number): PavilionSite | undefined {
  return getPavilionSites(pavilions).find((p) => p.x === x && p.y === y);
}

export function countPavilionSites(pavilions: PavilionOrder[]): number {
  return new Set(pavilions.map((p) => p.pid)).size;
}
