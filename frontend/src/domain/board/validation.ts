import { countPavilionSites } from "./queries";
import type { Board } from "../types";

export function validateBoard(board: Board): string[] {
  const errors: string[] = [];
  if (countPavilionSites(board.pavilions) === 0) {
    errors.push("Add at least one pavilion.");
  }
  if (board.pavilions.length === 0) {
    errors.push("Add at least one flower order.");
  }
  return errors;
}

export function isBoardReadyForSimulation(board: Board): boolean {
  return validateBoard(board).length === 0;
}
