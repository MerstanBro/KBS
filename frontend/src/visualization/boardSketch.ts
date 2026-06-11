import type p5 from "p5";
import { pavilionColor, uniquePavilionSites } from "../domain/flowers";
import { createDefaultBoard } from "../domain/defaultBoard";
import type { AnimationMove, Board, PlaybackState } from "../domain/types";

const FALLBACK_BOARD = createDefaultBoard();

export interface BoardSketchOptions {
  getBoard: () => Board | undefined;
  getAnimationQueue: () => AnimationMove[];
  getPlayback?: () => PlaybackState | null;
  canvasParent: HTMLElement | null;
}

export function createBoardSketch({
  getBoard,
  getAnimationQueue,
  getPlayback,
  canvasParent,
}: BoardSketchOptions) {
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
      const playback = getPlayback?.() ?? null;
      const animationQueue = playback ? [] : getAnimationQueue();

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

        const siteOrders = playback?.pavilionOrders?.filter(
          (order) => order.pid === site.pid && order.x === site.x && order.y === site.y,
        );
        const totalNeeded = siteOrders?.reduce((sum, order) => sum + order.needed, 0) ?? 0;
        const totalDelivered = siteOrders?.reduce((sum, order) => sum + order.delivered, 0) ?? 0;
        const progress = totalNeeded ? totalDelivered / totalNeeded : 0;

        if (playback && totalNeeded > 0) {
          sketch.noFill();
          sketch.stroke(220, 220, 220);
          sketch.arc(px, py, 36, 36, 0, sketch.TWO_PI);
          sketch.stroke(46, 125, 82, 230);
          sketch.arc(px, py, 36, 36, -sketch.HALF_PI, -sketch.HALF_PI + sketch.TWO_PI * progress);
        }

        sketch.fill(c[0], c[1], c[2], playback ? 220 : 220);
        sketch.stroke(progress >= 1 ? 46 : 60, progress >= 1 ? 125 : 60, progress >= 1 ? 82 : 60);
        sketch.circle(px, py, 28);
        sketch.fill(20);
        sketch.noStroke();
        sketch.textSize(9);
        sketch.text(`P${site.pid}`, px, py + 18);

        if (playback && totalNeeded > 0) {
          sketch.fill(30);
          sketch.textSize(8);
          sketch.text(`${totalDelivered}/${totalNeeded}`, px, py - 16);
        }
      });

      if (playback) {
        robotX = playback.x;
        robotY = playback.y;
        targetX = playback.x;
        targetY = playback.y;
        lastAction = playback.action;
      } else if (
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
      const cargoCount = playback?.robotInventory?.reduce((sum, item) => sum + item.count, 0) ?? 0;

      sketch.fill(46, 125, 82, 230);
      sketch.stroke(20, 80, 50);
      sketch.circle(rx, ry, 34 + Math.sin(pulse) * 3);

      if (playback && cargoCount > 0) {
        sketch.fill(255, 193, 7, 240);
        sketch.stroke(120, 80, 0);
        sketch.circle(rx + 14, ry - 14, 16);
        sketch.fill(40);
        sketch.noStroke();
        sketch.textAlign(sketch.CENTER, sketch.CENTER);
        sketch.textSize(9);
        sketch.text(String(cargoCount), rx + 14, ry - 14);
      }

      if (playback?.highlightNodeId != null) {
        sketch.noFill();
        sketch.stroke(194, 24, 91, 220);
        sketch.strokeWeight(2);
        sketch.rect(rx - 38, ry - 38, 76, 76, 12);
        sketch.strokeWeight(1);
      } else if (playback) {
        sketch.fill(46, 125, 82, 40);
        sketch.stroke(46, 125, 82, 180);
        sketch.rect(rx - 36, ry - 36, 72, 72, 10);
      }

      sketch.fill(30);
      sketch.noStroke();
      sketch.textAlign(sketch.LEFT, sketch.TOP);
      sketch.textSize(11);
      sketch.text(lastAction, 8, 8);
    };
  };
}
