import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  connectSimulation,
  createDefaultBoard,
  SIMULATION_LOG,
  SIMULATION_STATUS,
} from "../../domain";
import { installMockWebSocket, MockWebSocket } from "../mockWebSocket";

describe("simulation domain", () => {
  beforeEach(() => {
    installMockWebSocket();
  });

  it("opens a websocket and sends the board payload", () => {
    const logs: string[] = [];
    connectSimulation(createDefaultBoard(), { onLog: (line) => logs.push(line) });
    const socket = MockWebSocket.latest();
    socket.open();

    expect(socket.url).toContain("/ws/solve");
    expect(logs).toContain(SIMULATION_LOG.CONNECTED);

    const sent = JSON.parse(socket.send.mock.calls[0]![0] as string);
    expect(sent.meta.max_load).toBe(4);
  });

  it("forwards robot move events", () => {
    const moves: Array<{ to_x: number }> = [];
    connectSimulation(createDefaultBoard(), {
      onMove: (data) => moves.push(data),
      onStatus: vi.fn(),
    });

    MockWebSocket.latest().open();
    MockWebSocket.latest().emitMessage({
      event: "ROBOT_MOVE",
      data: { to_x: 3, to_y: 2, action: "move", state: "load" },
    });

    expect(moves).toHaveLength(1);
  });

  it("reports connection errors", () => {
    let status = "";
    connectSimulation(createDefaultBoard(), {
      onStatus: (value) => {
        status = value;
      },
    });

    MockWebSocket.latest().emitError();
    expect(status).toBe(SIMULATION_STATUS.FAILED);
  });
});
