import type { Board, EngineEvent, RobotMoveEvent, SimulationHandlers } from "../types";
import { toApiPayload } from "../solver/apiPayload";
import { formatSimulationEvent, SIMULATION_LOG, SIMULATION_STATUS } from "./messages";

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
      handlers.onStatus?.(`Optimal solution at node #${message.data.node_id}`);
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
