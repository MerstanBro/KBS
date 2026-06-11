import type { FlowerColor, FlowerType, PlacementMode } from "./constants";

export interface BoardMeta {
  warehouse_x: number;
  warehouse_y: number;
  start_x: number;
  start_y: number;
  grid_size: number;
}

export interface PavilionOrder {
  pid: number;
  x: number;
  y: number;
  type: FlowerType | string;
  color: FlowerColor | string;
  needed: number;
  delivered: number;
}

export interface Board {
  meta: BoardMeta;
  pavilions: PavilionOrder[];
}

export interface ApiMeta {
  upper_bound: number;
  max_load: number;
  warehouse_x: number;
  warehouse_y: number;
  start_x: number;
  start_y: number;
}

export interface ApiPayload {
  meta: ApiMeta;
  pavilions: PavilionOrder[];
}

export interface DerivedSolverMeta {
  max_load: number;
  upper_bound: number;
  bestcase_estimate: number;
}

export interface PavilionSite {
  pid: number;
  x: number;
  y: number;
  type: string;
  color: string;
  needed: number;
  delivered: number;
}

export interface FlowerOrderPatch {
  type?: FlowerType | string;
  color?: FlowerColor | string;
  needed?: number;
}

export interface BoardMetaPatch {
  warehouse_x?: number;
  warehouse_y?: number;
  start_x?: number;
  start_y?: number;
  grid_size?: number;
}

export interface RobotMoveEvent {
  to_x: number;
  to_y: number;
  action: string;
  state: string;
  g_n: number;
  f_n: number;
}

export interface AnimationMove {
  x: number;
  y: number;
  action: string;
  state: string;
  g_n: number;
  f_n: number;
}

export interface SimulationHandlers {
  onLog?: (line: string) => void;
  onStatus?: (status: string) => void;
  onBoard?: (board: Board) => void;
  onMove?: (data: RobotMoveEvent) => void;
  onDone?: () => void;
  onError?: () => void;
  onClose?: () => void;
}

export interface EngineEvent {
  event: string;
  data: Record<string, unknown> & {
    node_id?: number;
    nodes?: unknown[];
    to_x?: number;
    to_y?: number;
    action?: string;
    state?: string;
    g_n?: number;
    f_n?: number;
  };
}

export type PlacementModesMap = Record<"WAREHOUSE" | "ROBOT" | "PAVILION", PlacementMode>;
