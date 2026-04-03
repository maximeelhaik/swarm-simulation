import { Vector } from "./vector";
import { Boid } from "./boid";

export class SpatialGrid {
  cellSize: number;
  cols: number = 0;
  rows: number = 0;
  cells: Boid[][] = [];

  constructor(w: number, h: number, cellSize: number) {
    this.cellSize = cellSize;
    this.resize(w, h);
  }

  resize(w: number, h: number) {
    this.cols = Math.max(1, Math.ceil(w / this.cellSize));
    this.rows = Math.max(1, Math.ceil(h / this.cellSize));
    this.cells = new Array(this.cols * this.rows).fill(null).map(() => []);
  }

  clear() {
    for (let i = 0; i < this.cells.length; i++) this.cells[i].length = 0;
  }

  getIndex(v: Vector) {
    let c = Math.floor(v.x / this.cellSize);
    let r = Math.floor(v.y / this.cellSize);
    c = Math.max(0, Math.min(c, this.cols - 1));
    r = Math.max(0, Math.min(r, this.rows - 1));
    return c + r * this.cols;
  }

  insert(boid: Boid) {
    this.cells[this.getIndex(boid.pos)].push(boid);
  }

  getNearby(boid: Boid, radius: number) {
    const nearby: Boid[] = [];
    const rCells = Math.ceil(radius / this.cellSize);
    const c = Math.floor(boid.pos.x / this.cellSize);
    const row = Math.floor(boid.pos.y / this.cellSize);

    for (let i = -rCells; i <= rCells; i++) {
      for (let j = -rCells; j <= rCells; j++) {
        const cc = c + i;
        const rr = row + j;
        if (cc >= 0 && cc < this.cols && rr >= 0 && rr < this.rows) {
          nearby.push(...this.cells[cc + rr * this.cols]);
        }
      }
    }

    return nearby;
  }
}
