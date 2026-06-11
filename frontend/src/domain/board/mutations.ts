import {
  DEFAULT_FLOWER_COLOR,
  DEFAULT_FLOWER_TYPE,
  MIN_ORDER_QTY,
  type FlowerColor,
  type FlowerType,
  type PlacementMode,
} from "../constants";
import type { Board, BoardMetaPatch, FlowerOrderPatch } from "../types";
import { getPavilionSites, nextPavilionId, pavilionAtCell } from "./queries";

export function updateMeta(board: Board, patch: BoardMetaPatch): Board {
  return { ...board, meta: { ...board.meta, ...patch } };
}

export function setWarehouse(board: Board, x: number, y: number): Board {
  return updateMeta(board, { warehouse_x: x, warehouse_y: y });
}

export function setRobotStart(board: Board, x: number, y: number): Board {
  return updateMeta(board, { start_x: x, start_y: y });
}

export function setGridSize(board: Board, gridSize: number): Board {
  return updateMeta(board, { grid_size: gridSize });
}

export function addPavilionSite(board: Board, x: number, y: number): Board {
  if (pavilionAtCell(board.pavilions, x, y)) return board;
  const pid = nextPavilionId(board.pavilions);
  return {
    ...board,
    pavilions: [
      ...board.pavilions,
      {
        pid,
        x,
        y,
        type: DEFAULT_FLOWER_TYPE,
        color: DEFAULT_FLOWER_COLOR,
        needed: MIN_ORDER_QTY,
        delivered: 0,
      },
    ],
  };
}

export function removePavilionSite(board: Board, pid: number): Board {
  return { ...board, pavilions: board.pavilions.filter((p) => p.pid !== pid) };
}

export function addFlowerOrder(
  board: Board,
  pid: number,
  type: FlowerType | string,
  color: FlowerColor | string,
  needed: number,
): Board {
  const site = getPavilionSites(board.pavilions).find((p) => p.pid === pid);
  if (!site) return board;
  return {
    ...board,
    pavilions: [...board.pavilions, { pid, x: site.x, y: site.y, type, color, needed, delivered: 0 }],
  };
}

export function removeFlowerOrder(board: Board, index: number): Board {
  const pavilions = [...board.pavilions];
  pavilions.splice(index, 1);
  return { ...board, pavilions };
}

export function updateFlowerOrder(board: Board, index: number, patch: FlowerOrderPatch): Board {
  return {
    ...board,
    pavilions: board.pavilions.map((p, i) => (i === index ? { ...p, ...patch } : p)),
  };
}

export function applyPlacement(board: Board, mode: PlacementMode, x: number, y: number): Board {
  if (mode === "warehouse") return setWarehouse(board, x, y);
  if (mode === "robot") return setRobotStart(board, x, y);
  return addPavilionSite(board, x, y);
}
