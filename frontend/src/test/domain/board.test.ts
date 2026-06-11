import { describe, expect, it } from "vitest";
import {
  addFlowerOrder,
  addPavilionSite,
  applyPlacement,
  createDefaultBoard,
  PLACEMENT_MODES,
  removePavilionSite,
  setRobotStart,
  setWarehouse,
  validateBoard,
} from "../../domain";

describe("board domain", () => {
  it("creates a default board with grid metadata", () => {
    const board = createDefaultBoard();
    expect(board.meta.grid_size).toBe(6);
    expect(board.pavilions.length).toBeGreaterThan(0);
  });

  it("updates warehouse and robot positions", () => {
    let board = createDefaultBoard();
    board = setWarehouse(board, 4, 5);
    board = setRobotStart(board, 1, 1);
    expect(board.meta.warehouse_x).toBe(4);
    expect(board.meta.start_x).toBe(1);
  });

  it("adds and removes pavilion sites", () => {
    let board = createDefaultBoard();
    board = { ...board, pavilions: [] };
    board = addPavilionSite(board, 2, 3);
    expect(board.pavilions).toHaveLength(1);
    board = removePavilionSite(board, board.pavilions[0]!.pid);
    expect(board.pavilions).toHaveLength(0);
  });

  it("routes placement mode to the correct mutation", () => {
    let board = createDefaultBoard();
    board = applyPlacement(board, PLACEMENT_MODES.WAREHOUSE, 5, 5);
    expect(board.meta.warehouse_x).toBe(5);
  });

  it("adds flower orders for a pavilion", () => {
    let board = createDefaultBoard();
    const pid = board.pavilions[0]!.pid;
    const before = board.pavilions.length;
    board = addFlowerOrder(board, pid, "Tulip", "yellow", 2);
    expect(board.pavilions.length).toBe(before + 1);
  });

  it("validates that pavilions and orders exist", () => {
    const empty = { meta: createDefaultBoard().meta, pavilions: [] };
    expect(validateBoard(empty)).toContain("Add at least one pavilion.");
  });
});
