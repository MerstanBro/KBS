export const GRID_SIZE_DEFAULT = 6;
export const GRID_SIZE_MIN = 4;
export const GRID_SIZE_MAX = 8;

export const ROBOT_MAX_LOAD = 4;

export const FLOWER_TYPES = ["Rose", "Tulip", "Orchid", "Rose Goliat"] as const;
export const FLOWER_COLORS = ["red", "pink", "white", "yellow", "purple", "gold", "light pink"] as const;

export type FlowerType = (typeof FLOWER_TYPES)[number];
export type FlowerColor = (typeof FLOWER_COLORS)[number];

export const DEFAULT_FLOWER_TYPE: FlowerType = FLOWER_TYPES[0];
export const DEFAULT_FLOWER_COLOR: FlowerColor = FLOWER_COLORS[0];
export const MIN_ORDER_QTY = 1;
export const MAX_ORDER_QTY = 6;

export const PLACEMENT_MODES = {
  WAREHOUSE: "warehouse",
  ROBOT: "robot",
  PAVILION: "pavilion",
} as const;

export type PlacementMode = (typeof PLACEMENT_MODES)[keyof typeof PLACEMENT_MODES];

export const WIZARD_STEPS = ["Board Layout", "Flower Orders", "Simulation"] as const;
