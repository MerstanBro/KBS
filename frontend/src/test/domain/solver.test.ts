import { describe, expect, it } from "vitest";
import {
  calcStrictUpperBound,
  createDefaultBoard,
  deriveSolverMeta,
  toApiPayload,
} from "../../domain";

describe("solver domain", () => {
  it("derives max_load and strict upper_bound from the board", () => {
    const board = createDefaultBoard();
    const derived = deriveSolverMeta(board);
    const strictUb = calcStrictUpperBound(
      board.pavilions,
      board.meta.start_x,
      board.meta.start_y,
      board.meta.warehouse_x,
      board.meta.warehouse_y,
    );

    expect(derived.max_load).toBe(4);
    expect(derived.upper_bound).toBe(strictUb);
    expect(derived.upper_bound).toBe(27);
    expect(derived.upper_bound).toBeGreaterThanOrEqual(derived.bestcase_estimate);
  });

  it("builds API payload matching backend contract", () => {
    const payload = toApiPayload(createDefaultBoard());
    expect(payload.meta.max_load).toBe(4);
    expect(payload.meta.upper_bound).toBe(27);
    expect("grid_size" in payload.meta).toBe(false);
    expect(payload.pavilions.length).toBeGreaterThan(0);
  });
});
