import { Vector } from "@/lib/vector";

export interface BoidConfig {
  maxSpeed: number;
  maxForce: number;
  perceptionRadius: number;
  topoNeighbors: number;
  occlusionThreshold: number;
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;
  noiseLevel: number;
  predatorRadius: number;
  predatorForce: number;
}

export class Boid {
  pos: Vector;
  vel: Vector;
  acc: Vector;
  isPeripheral: boolean;

  constructor(x: number, y: number, config: BoidConfig) {
    this.pos = new Vector(x, y);
    this.vel = Vector.random2D().mult((0.45 + Math.random() * 0.55) * config.maxSpeed);
    this.acc = new Vector(0, 0);
    this.isPeripheral = false;
  }

  edges(width: number, height: number) {
    if (this.pos.x > width) this.pos.x = 0;
    else if (this.pos.x < 0) this.pos.x = width;

    if (this.pos.y > height) this.pos.y = 0;
    else if (this.pos.y < 0) this.pos.y = height;
  }

  flock(nearbyBoids: Boid[], predators: { pos: Vector }[], config: BoidConfig) {
    const distances = [];

    for (const other of nearbyBoids) {
      if (other !== this) {
        const d = this.pos.dist(other.pos);
        if (d < config.perceptionRadius) distances.push({ boid: other, dist: d });
      }
    }

    distances.sort((a, b) => a.dist - b.dist);
    const topoNeighbors = distances.slice(0, Math.max(config.topoNeighbors * 2, config.topoNeighbors + 2));

    const visibleNeighbors = [];
    for (const item of topoNeighbors) {
      const angleToNeighbor = Vector.sub(item.boid.pos, this.pos).heading();
      let isOccluded = false;

      for (const vis of visibleNeighbors) {
        let diff = Math.abs(angleToNeighbor - vis.angle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < config.occlusionThreshold) {
          isOccluded = true;
          break;
        }
      }

      if (!isOccluded && visibleNeighbors.length < config.topoNeighbors) {
        visibleNeighbors.push({ boid: item.boid, dist: item.dist, angle: angleToNeighbor });
      }
    }

    this.isPeripheral =
      visibleNeighbors.length < config.topoNeighbors ||
      (visibleNeighbors.length > 0 &&
        visibleNeighbors[visibleNeighbors.length - 1].dist > config.perceptionRadius * 0.6);

    let localNoise = config.noiseLevel;
    let localSpeed = config.maxSpeed;

    if (this.isPeripheral) {
      localNoise *= 2.2;
      localSpeed *= 1.08;
    }

    const alignment = new Vector(0, 0);
    const cohesion = new Vector(0, 0);
    const separation = new Vector(0, 0);
    let sepCount = 0;

    for (const item of visibleNeighbors) {
      alignment.add(item.boid.vel);
      cohesion.add(item.boid.pos);

      if (item.dist > 0 && item.dist < config.perceptionRadius * 0.3) {
        const diff = Vector.sub(this.pos, item.boid.pos);
        diff.normalize().div(item.dist);
        separation.add(diff);
        sepCount++;
      }
    }

    if (visibleNeighbors.length > 0) {
      alignment
        .div(visibleNeighbors.length)
        .setHeading(alignment.heading())
        .normalize()
        .mult(localSpeed)
        .sub(this.vel)
        .limit(config.maxForce);

      cohesion
        .div(visibleNeighbors.length)
        .sub(this.pos)
        .normalize()
        .mult(localSpeed)
        .sub(this.vel)
        .limit(config.maxForce);
    }

    if (sepCount > 0) {
      separation.div(sepCount).normalize().mult(localSpeed).sub(this.vel).limit(config.maxForce);
    }

    const evade = new Vector(0, 0);
    for (const p of predators) {
      const d = this.pos.dist(p.pos);
      if (d < config.predatorRadius) {
        const diff = Vector.sub(this.pos, p.pos);
        diff.normalize().div(Math.max(d / 10, 0.0001));
        evade.add(diff);
      }
    }

    alignment.mult(config.alignmentWeight);
    cohesion.mult(config.cohesionWeight);
    separation.mult(config.separationWeight);
    evade.mult(config.predatorForce);

    const noise = Vector.random2D().mult(localNoise);
    this.acc.add(alignment).add(cohesion).add(separation).add(noise).add(evade);
  }

  update(config: BoidConfig) {
    this.pos.add(this.vel);
    this.vel.add(this.acc);
    this.vel.limit(this.isPeripheral ? config.maxSpeed * 1.08 : config.maxSpeed);
    this.acc.mult(0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    const theta = this.vel.heading() + Math.PI / 2;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(theta);

    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(-3, 4);
    ctx.lineTo(3, 4);
    ctx.closePath();

    ctx.fillStyle = this.isPeripheral ? "#22eaff" : "#4f9cf6";
    ctx.globalAlpha = this.isPeripheral ? 0.92 : 0.68;
    ctx.fill();
    ctx.restore();
  }
}
