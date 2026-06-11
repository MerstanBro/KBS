import type { FlowerColor } from "./constants";

export const COLOR_MAP: Record<FlowerColor, [number, number, number]> = {
  red: [220, 60, 60],
  pink: [255, 140, 180],
  white: [240, 240, 240],
  yellow: [240, 210, 50],
  purple: [160, 80, 200],
  gold: [220, 180, 40],
  "light pink": [255, 190, 210],
};

const FALLBACK_RGB: [number, number, number] = [120, 120, 120];

export function pavilionColor(name: string): [number, number, number] {
  return COLOR_MAP[name as FlowerColor] ?? FALLBACK_RGB;
}

export function pavilionColorCss(name: string): string {
  const [r, g, b] = pavilionColor(name);
  return `rgb(${r}, ${g}, ${b})`;
}

export function uniquePavilionSites<T extends { pid: number; x: number; y: number }>(pavilions: T[]): T[] {
  const seen = new Set<string>();
  return pavilions.filter((p) => {
    const key = `${p.pid}-${p.x}-${p.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
