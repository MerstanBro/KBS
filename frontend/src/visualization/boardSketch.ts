import type p5 from "p5";
import { pavilionColor, uniquePavilionSites } from "../domain/flowers";
import { createDefaultBoard } from "../domain/defaultBoard";
import type { AnimationMove, Board } from "../domain/types";

const FALLBACK_BOARD = createDefaultBoard();

export interface BoardSketchOptions {
  getBoard: () => Board | undefined;
  getAnimationQueue: () => AnimationMove[];
  canvasParent: HTMLElement | null;
}

export function createBoardSketch({ getBoard, getAnimationQueue, canvasParent }: BoardSketchOptions) {
  return (sketch: p5) => {
    const CELL_SIZE = 72;
    let robotX = FALLBACK_BOARD.meta.start_x;
    let robotY = FALLBACK_BOARD.meta.start_y;
    let targetX = robotX;
    let targetY = robotY;
    let pulse = 0;
    let lastAction = "Ready";

    sketch.setup = () => {
      const board = getBoard() ?? FALLBACK_BOARD;
      const size = (board.meta.grid_size ?? 6) * CELL_SIZE;
      if (canvasParent) {
        sketch.createCanvas(size, size).parent(canvasParent);
      }
    };

    sketch.draw = () => {
      const board = getBoard() ?? FALLBACK_BOARD;
      const meta = board.meta ?? FALLBACK_BOARD.meta;
      const gridSize = meta.grid_size ?? 6;
      const sites = uniquePavilionSites(board.pavilions ?? []);
      const animationQueue = getAnimationQueue();

      sketch.background(248, 251, 245);
      pulse += 0.08;

      sketch.stroke(220, 230, 220);
      for (let i = 0; i <= gridSize; i++) {
        sketch.line(i * CELL_SIZE, 0, i * CELL_SIZE, sketch.height);
        sketch.line(0, i * CELL_SIZE, sketch.width, i * CELL_SIZE);
      }

      const toPx = (gx: number, gy: number): [number, number] => [
        (gx - 0.5) * CELL_SIZE,
        (gy - 0.5) * CELL_SIZE,
      ];
      const [whx, why] = toPx(meta.warehouse_x, meta.warehouse_y);

      sketch.fill(139, 90, 43);
      sketch.stroke(90, 55, 20);
      sketch.rect(whx - 22, why - 22, 44, 44, 6);
      sketch.fill(255);
      sketch.noStroke();
      sketch.textAlign(sketch.CENTER, sketch.CENTER);
      sketch.textSize(10);
      sketch.text("WH", whx, why);

      sites.forEach((site) => {
        const [px, py] = toPx(site.x, site.y);
        const c = pavilionColor(site.color);
        sketch.fill(c[0], c[1], c[2], 220);
        sketch.stroke(60);
        sketch.circle(px, py, 28);
        sketch.fill(20);
        sketch.noStroke();
        sketch.textSize(9);
        sketch.text(`P${site.pid}`, px, py + 18);
      });

      if (
        Math.abs(robotX - targetX) < 0.04 &&
        Math.abs(robotY - targetY) < 0.04 &&
        animationQueue.length > 0
      ) {
        const nextMove = animationQueue.shift()!;
        targetX = nextMove.x;
        targetY = nextMove.y;
        lastAction = nextMove.action;
      } else if (Math.abs(robotX - targetX) >= 0.04 || Math.abs(robotY - targetY) >= 0.04) {
        robotX = sketch.lerp(robotX, targetX, 0.12);
        robotY = sketch.lerp(robotY, targetY, 0.12);
      }

      const [rx, ry] = toPx(robotX, robotY);
      sketch.fill(46, 125, 82, 230);
      sketch.stroke(20, 80, 50);
      sketch.circle(rx, ry, 34 + Math.sin(pulse) * 3);

      sketch.fill(30);
      sketch.noStroke();
      sketch.textAlign(sketch.LEFT, sketch.TOP);
      sketch.textSize(11);
      sketch.text(lastAction, 8, 8);
    };
  };
}
