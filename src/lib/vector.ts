export class Vector {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(v: Vector) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vector) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n: number) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  div(n: number) {
    if (n !== 0) {
      this.x /= n;
      this.y /= n;
    }
    return this;
  }

  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  mag() {
    return Math.sqrt(this.magSq());
  }

  normalize() {
    const m = this.mag();
    if (m !== 0) this.div(m);
    return this;
  }

  limit(max: number) {
    if (this.magSq() > max * max) {
      this.normalize();
      this.mult(max);
    }
    return this;
  }

  copy() {
    return new Vector(this.x, this.y);
  }

  dist(v: Vector) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  setHeading(a: number) {
    const m = this.mag();
    this.x = m * Math.cos(a);
    this.y = m * Math.sin(a);
    return this;
  }

  heading() {
    return Math.atan2(this.y, this.x);
  }

  lerp(v: Vector, amount: number) {
    this.x += (v.x - this.x) * amount;
    this.y += (v.y - this.y) * amount;
    return this;
  }

  static sub(v1: Vector, v2: Vector) {
    return new Vector(v1.x - v2.x, v1.y - v2.y);
  }

  static random2D() {
    const a = Math.random() * Math.PI * 2;
    return new Vector(Math.cos(a), Math.sin(a));
  }
}
