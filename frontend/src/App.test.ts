import { describe, expect, it } from "vitest";
import { WIZARD_STEPS } from "./domain/constants";

describe("App wizard", () => {
  it("defines three setup steps", () => {
    expect(WIZARD_STEPS).toEqual(["Board Layout", "Flower Orders", "Simulation"]);
  });
});
