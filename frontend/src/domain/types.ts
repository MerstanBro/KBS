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

export interface SearchTreeNode {
  node_id: number;
  parent_id: number;
  robot_x: number;
  robot_y: number;
  robot_state: string;
  status: string;
  g_n: number;
  f_n: number;
  h_n?: number;
  last_action: string;
}

export interface PathCommand {
  step: number;
  line: string;
  command: string;
  detail: string;
  state: string;
  pos: { x: number; y: number };
  stepCost: number;
  g: number;
}

export interface GoalInfo {
  node_id: number;
  g_n: number;
  f_n: number;
  message?: string;
}

export interface TreeGenerationLevel {
  offset: number;
  label: string;
  nodes: SearchTreeNode[];
}

export interface SimulationResult {
  goal: GoalInfo | null;
  searchTree: SearchTreeNode[];
  pathCommands: PathCommand[];
  totalCost: number;
  logs: string[];
}

export interface PavilionSiteState {
  pid: number;
  x: number;
  y: number;
  orders: PavilionOrder[];
  totalNeeded: number;
  totalDelivered: number;
  complete: boolean;
}

export interface PlaybackState {
  x: number;
  y: number;
  action: string;
  highlightNodeId?: number;
  pavilionOrders?: PavilionOrder[];
  robotInventory?: RobotInventoryItem[];
}

export interface RobotInventoryItem {
  type: string;
  color: string;
  label: string;
  count: number;
}

export interface PlaybackSimulationState {
  pavilionOrders: PavilionOrder[];
  robotInventory: RobotInventoryItem[];
  totalLoaded: number;
  maxLoad: number;
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
  onGoal?: (goal: GoalInfo) => void;
  onSearchTree?: (nodes: SearchTreeNode[]) => void;
  onPathCommand?: (command: PathCommand) => void;
  onPathTrace?: (lines: string[], totalCost: number) => void;
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
