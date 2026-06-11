import type { EngineEvent } from "../types";

export function formatSimulationEvent(message: EngineEvent): string {
  if (message.event === "SEARCH_TREE") {
    const nodes = message.data.nodes ?? [];
    return `${message.event}: ${nodes.length} nodes explored`;
  }
  if (message.event === "PATH_COMMAND") {
    return String(message.data.line ?? message.event);
  }
  if (message.event === "PATH_TRACE") {
    const lines = Array.isArray(message.data.lines) ? message.data.lines : [];
    return `${message.event}: ${lines.length} commands, total g=${message.data.total_cost}`;
  }
  return `${message.event}: ${JSON.stringify(message.data)}`;
}

export const SIMULATION_STATUS = {
  READY: "Ready",
  CONNECTING: "Connecting...",
  RUNNING: "Running search...",
  COMPLETE: "Complete",
  FAILED: "Connection failed",
  DISCONNECTED: "Disconnected",
} as const;

export const SIMULATION_LOG = {
  CONNECTED: "Connected to engine.",
  CONNECTION_ERROR: "ERROR: Could not connect to the solver. Make sure `npm run dev` is running.",
} as const;
