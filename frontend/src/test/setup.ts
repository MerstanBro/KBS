import "preact/compat";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/preact";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

vi.mock("p5", () => ({
  default: vi.fn(function MockP5(this: { remove: ReturnType<typeof vi.fn> }) {
    this.remove = vi.fn();
  }),
}));
