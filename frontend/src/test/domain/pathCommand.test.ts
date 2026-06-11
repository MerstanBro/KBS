import { describe, expect, it } from "vitest";
import { parsePathCommandLine } from "../../domain/simulation/pathCommand";

describe("pathCommand", () => {
  it("parses movement commands", () => {
    const parsed = parsePathCommandLine("robot move down | pos=(3,2) | +1 | g=1", 2);
    expect(parsed.command).toBe("robot move down");
    expect(parsed.pos).toEqual({ x: 3, y: 2 });
    expect(parsed.stepCost).toBe(1);
    expect(parsed.g).toBe(1);
  });

  it("parses load commands with detail and state", () => {
    const parsed = parsePathCommandLine(
      "robot load | Rose red | state=load | pos=(3,2) | +0 | g=1",
      3,
    );
    expect(parsed.command).toBe("robot load");
    expect(parsed.detail).toBe("Rose red");
    expect(parsed.state).toBe("load");
  });
});
