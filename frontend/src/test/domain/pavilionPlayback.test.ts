import { describe, expect, it } from "vitest";
import { createDefaultBoard } from "../../domain/defaultBoard";
import {
  buildPavilionSiteStates,
  simulatePavilionOrdersAtStep,
  simulatePlaybackAtStep,
} from "../../domain/simulation/pavilionPlayback";

describe("pavilionPlayback", () => {
  it("tracks deliveries after simulated unload steps", () => {
    const board = createDefaultBoard();
    const commands = [
      {
        command: "robot load",
        detail: "Rose red",
        pos: { x: 3, y: 2 },
      },
      {
        command: "robot load",
        detail: "Rose red",
        pos: { x: 3, y: 2 },
      },
      {
        command: "robot unload",
        detail: "",
        pos: { x: 2, y: 4 },
      },
    ];

    const orders = simulatePavilionOrdersAtStep(board, commands, 2);
    const roseRed = orders.find((order) => order.type === "Rose" && order.color === "red");
    expect(roseRed?.delivered).toBe(2);
  });

  it("summarizes site progress", () => {
    const board = createDefaultBoard();
    const orders = simulatePavilionOrdersAtStep(board, [], -1);
    const sites = buildPavilionSiteStates(orders);
    expect(sites.every((site) => site.totalDelivered === 0)).toBe(true);
    expect(sites.length).toBe(4);
  });

  it("tracks robot inventory across load and unload steps", () => {
    const board = createDefaultBoard();
    const commands = [
      { command: "robot load", detail: "Rose red", pos: { x: 3, y: 2 } },
      { command: "robot load", detail: "Tulip red", pos: { x: 3, y: 2 } },
      { command: "robot unload", detail: "", pos: { x: 2, y: 4 } },
    ];

    const afterLoad = simulatePlaybackAtStep(board, commands, 1);
    expect(afterLoad.totalLoaded).toBe(2);
    expect(afterLoad.robotInventory).toHaveLength(2);

    const afterUnload = simulatePlaybackAtStep(board, commands, 2);
    expect(afterUnload.totalLoaded).toBe(1);
    expect(afterUnload.robotInventory[0]?.label).toBe("Tulip red");
  });
});
