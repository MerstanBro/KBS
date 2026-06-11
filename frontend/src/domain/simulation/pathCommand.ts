import type { PathCommand } from "../types";

export function parsePathCommandLine(line: string, step: number): PathCommand {
  const parts = line.split(" | ").map((part) => part.trim());
  const command = parts[0] ?? line;
  let detail = "";
  let state = "";
  let pos = { x: 0, y: 0 };
  let stepCost = 0;
  let g = 0;

  for (const part of parts.slice(1)) {
    const posMatch = part.match(/^pos=\((\d+),(\d+)\)$/);
    if (posMatch) {
      pos = { x: Number(posMatch[1]), y: Number(posMatch[2]) };
      continue;
    }
    if (part.startsWith("+")) {
      stepCost = Number(part.slice(1));
      continue;
    }
    if (part.startsWith("g=")) {
      g = Number(part.slice(2));
      continue;
    }
    if (part.startsWith("state=")) {
      state = part.slice(6);
      continue;
    }
    detail = detail ? `${detail} · ${part}` : part;
  }

  return { step, line, command, detail, state, pos, stepCost, g };
}

export function playbackPositionAt(commands: PathCommand[], index: number) {
  if (commands.length === 0) return null;
  const clamped = Math.max(0, Math.min(index, commands.length - 1));
  const cmd = commands[clamped]!;
  return {
    x: cmd.pos.x,
    y: cmd.pos.y,
    action: cmd.detail ? `${cmd.command} · ${cmd.detail}` : cmd.command,
    g: cmd.g,
    stepCost: cmd.stepCost,
  };
}
