import { ROBOT_MAX_LOAD } from "../constants";
import type { Board, PavilionOrder, PavilionSiteState, PlaybackSimulationState, RobotInventoryItem } from "../types";

const LOAD_ALIASES: Record<string, { type: string; color: string }> = {
  "RG gold": { type: "Rose Goliat", color: "gold" },
  "RG light pink": { type: "Rose Goliat", color: "light pink" },
};

function orderLoadKey(order: PavilionOrder): string {
  return `${order.type}|${order.color}`;
}

function detailToLoadKey(detail: string): string {
  const alias = LOAD_ALIASES[detail];
  if (alias) return `${alias.type}|${alias.color}`;
  const lastSpace = detail.lastIndexOf(" ");
  if (lastSpace <= 0) return detail;
  return `${detail.slice(0, lastSpace)}|${detail.slice(lastSpace + 1)}`;
}

function loadKeyToLabel(key: string): string {
  for (const [label, value] of Object.entries(LOAD_ALIASES)) {
    if (`${value.type}|${value.color}` === key) return label;
  }
  const pipe = key.indexOf("|");
  if (pipe <= 0) return key;
  return `${key.slice(0, pipe)} ${key.slice(pipe + 1)}`;
}

function inventoryToItems(inventory: Map<string, number>): RobotInventoryItem[] {
  return [...inventory.entries()]
    .filter(([, count]) => count > 0)
    .map(([key, count]) => {
      const pipe = key.indexOf("|");
      return {
        type: pipe > 0 ? key.slice(0, pipe) : key,
        color: pipe > 0 ? key.slice(pipe + 1) : "",
        label: loadKeyToLabel(key),
        count,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function cloneOrders(board: Board): PavilionOrder[] {
  return board.pavilions.map((order) => ({ ...order, delivered: 0 }));
}

export function simulatePlaybackAtStep(
  board: Board,
  commands: Array<{ command: string; detail: string; pos: { x: number; y: number } }>,
  stepIndex: number,
  maxLoad = ROBOT_MAX_LOAD,
): PlaybackSimulationState {
  const orders = cloneOrders(board);
  const inventory = new Map<string, number>();

  const lastIndex = Math.max(-1, Math.min(stepIndex, commands.length - 1));

  for (let i = 0; i <= lastIndex; i += 1) {
    const cmd = commands[i]!;

    if (cmd.command === "robot load" && cmd.detail) {
      const key = detailToLoadKey(cmd.detail);
      inventory.set(key, (inventory.get(key) ?? 0) + 1);
      continue;
    }

    if (cmd.command === "robot unload") {
      for (const order of orders.filter((entry) => entry.x === cmd.pos.x && entry.y === cmd.pos.y)) {
        const key = orderLoadKey(order);
        const available = inventory.get(key) ?? 0;
        const remaining = order.needed - order.delivered;
        const drop = Math.min(remaining, available);
        if (drop <= 0) continue;
        order.delivered += drop;
        inventory.set(key, available - drop);
      }
    }
  }

  const robotInventory = inventoryToItems(inventory);
  const totalLoaded = robotInventory.reduce((sum, item) => sum + item.count, 0);

  return {
    pavilionOrders: orders,
    robotInventory,
    totalLoaded,
    maxLoad,
  };
}

export function simulatePavilionOrdersAtStep(
  board: Board,
  commands: Array<{ command: string; detail: string; pos: { x: number; y: number } }>,
  stepIndex: number,
): PavilionOrder[] {
  return simulatePlaybackAtStep(board, commands, stepIndex).pavilionOrders;
}

export function buildPavilionSiteStates(orders: PavilionOrder[]): PavilionSiteState[] {
  const sites = new Map<string, PavilionSiteState>();

  for (const order of orders) {
    const key = `${order.pid}-${order.x}-${order.y}`;
    const existing = sites.get(key);
    if (existing) {
      existing.orders.push(order);
      existing.totalNeeded += order.needed;
      existing.totalDelivered += order.delivered;
      existing.complete = existing.totalDelivered >= existing.totalNeeded;
      continue;
    }

    sites.set(key, {
      pid: order.pid,
      x: order.x,
      y: order.y,
      orders: [order],
      totalNeeded: order.needed,
      totalDelivered: order.delivered,
      complete: order.delivered >= order.needed,
    });
  }

  return [...sites.values()].sort((a, b) => a.pid - b.pid);
}

export const BOARD_CELL_PX = 72;

export function gridCellOverlayRect(x: number, y: number, cellSize = BOARD_CELL_PX) {
  const centerX = (x - 0.5) * cellSize;
  const centerY = (y - 0.5) * cellSize;
  return {
    left: centerX - cellSize * 0.35,
    top: centerY - cellSize * 0.35,
    width: cellSize * 0.7,
    height: cellSize * 0.7,
  };
}

export function robotOverlayRect(x: number, y: number, cellSize = BOARD_CELL_PX) {
  const centerX = (x - 0.5) * cellSize;
  const centerY = (y - 0.5) * cellSize;
  return {
    left: centerX - 22,
    top: centerY - 22,
    width: 44,
    height: 44,
  };
}
