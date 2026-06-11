import type {
  Board,
  EngineEvent,
  RobotMoveEvent,
  SearchTreeNode,
  SimulationHandlers,
} from "../types";
import { toApiPayload } from "../solver/apiPayload";
import { formatSimulationEvent, SIMULATION_LOG, SIMULATION_STATUS } from "./messages";
import { parsePathCommandLine } from "./pathCommand";

const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
export const WS_URL = `${wsProtocol}://${window.location.host}/ws/solve`;

export function connectSimulation(board: Board, handlers: SimulationHandlers): () => void {
  const ws = new WebSocket(WS_URL);
  const payload = toApiPayload(board);

  ws.onopen = () => {
    handlers.onStatus?.(SIMULATION_STATUS.RUNNING);
    handlers.onLog?.(SIMULATION_LOG.CONNECTED);
    ws.send(JSON.stringify(payload));
  };

  ws.onmessage = (event: MessageEvent<string>) => {
    const message = JSON.parse(event.data) as EngineEvent;
    handlers.onLog?.(formatSimulationEvent(message));

    if (message.event === "BOARD_SETUP") {
      handlers.onBoard?.(message.data as unknown as Board);
    }
    if (message.event === "GOAL") {
      const goal = message.data;
      handlers.onGoal?.({
        node_id: Number(goal.node_id),
        g_n: Number(goal.g_n ?? 0),
        f_n: Number(goal.f_n ?? 0),
        message: goal.message as string | undefined,
      });
      const cost =
        goal.g_n != null && goal.f_n != null ? ` (g=${goal.g_n}, f=${goal.f_n})` : "";
      handlers.onStatus?.(`Optimal solution at node #${goal.node_id}${cost}`);
    }
    if (message.event === "SEARCH_TREE") {
      handlers.onSearchTree?.((message.data.nodes ?? []) as SearchTreeNode[]);
    }
    if (message.event === "PATH_COMMAND") {
      const line = String(message.data.line ?? "");
      const step = Number(message.data.step ?? 0);
      handlers.onPathCommand?.(parsePathCommandLine(line, step));
    }
    if (message.event === "PATH_TRACE") {
      const lines = (message.data.lines ?? []) as string[];
      handlers.onPathTrace?.(lines, Number(message.data.total_cost ?? 0));
    }
    if (message.event === "ROBOT_MOVE") {
      handlers.onMove?.(message.data as RobotMoveEvent);
    }
    if (message.event === "DONE") {
      handlers.onStatus?.(SIMULATION_STATUS.COMPLETE);
      handlers.onDone?.();
      ws.close();
    }
  };

  ws.onerror = () => {
    handlers.onStatus?.(SIMULATION_STATUS.FAILED);
    handlers.onLog?.(SIMULATION_LOG.CONNECTION_ERROR);
    handlers.onError?.();
  };

  ws.onclose = () => {
    handlers.onClose?.();
  };

  return () => ws.close();
}
