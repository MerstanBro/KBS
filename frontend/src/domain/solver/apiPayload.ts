import type { ApiPayload, Board } from "../types";
import { deriveSolverMeta } from "./deriveMeta";

export function toApiPayload(board: Board): ApiPayload {
  const { grid_size: _gridSize, ...meta } = board.meta;
  const derived = deriveSolverMeta(board);

  return {
    meta: {
      upper_bound: derived.upper_bound,
      max_load: derived.max_load,
      warehouse_x: meta.warehouse_x,
      warehouse_y: meta.warehouse_y,
      start_x: meta.start_x,
      start_y: meta.start_y,
    },
    pavilions: board.pavilions,
  };
}
