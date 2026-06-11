import { ROBOT_MAX_LOAD } from "../constants";
import type { Board, DerivedSolverMeta } from "../types";
import { calcBestcase } from "./bestcase";
import { calcStrictUpperBound } from "./strictUpperBound";

export function deriveSolverMeta(board: Board): DerivedSolverMeta {
  const maxLoad = ROBOT_MAX_LOAD;
  const { warehouse_x, warehouse_y, start_x, start_y } = board.meta;
  const bestcaseEstimate = calcBestcase(board.pavilions, maxLoad, warehouse_x, warehouse_y);
  const upperBound = calcStrictUpperBound(
    board.pavilions,
    start_x,
    start_y,
    warehouse_x,
    warehouse_y,
  );

  return {
    max_load: maxLoad,
    upper_bound: upperBound,
    bestcase_estimate: bestcaseEstimate,
  };
}
