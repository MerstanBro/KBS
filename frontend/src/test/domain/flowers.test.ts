import { describe, expect, it } from "vitest";
import { COLOR_MAP, createDefaultBoard, pavilionColor, uniquePavilionSites } from "../../domain";

describe("flower domain", () => {
  it("default board includes meta and pavilion rows", () => {
    const board = createDefaultBoard();
    expect(board.pavilions.length).toBeGreaterThan(0);
    expect(board.meta.start_x).toBe(3);
  });

  it("pavilionColor returns mapped RGB values", () => {
    expect(pavilionColor("red")).toEqual(COLOR_MAP.red);
    expect(pavilionColor("light pink")).toEqual(COLOR_MAP["light pink"]);
  });

  it("pavilionColor falls back for unknown colors", () => {
    expect(pavilionColor("unknown")).toEqual([120, 120, 120]);
  });

  it("uniquePavilionSites deduplicates by pid and coordinates", () => {
    const pavilions = [
      { pid: 1, x: 2, y: 4, type: "Rose", color: "red", needed: 2, delivered: 0 },
      { pid: 1, x: 2, y: 4, type: "Rose", color: "pink", needed: 1, delivered: 0 },
      { pid: 2, x: 4, y: 3, type: "Tulip", color: "red", needed: 3, delivered: 0 },
    ];

    const sites = uniquePavilionSites(pavilions);
    expect(sites).toHaveLength(2);
    expect(sites.map((s) => s.pid)).toEqual([1, 2]);
  });
});
