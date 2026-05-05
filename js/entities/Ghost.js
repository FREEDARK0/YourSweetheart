const GHOST_SPEED = 70; // px/s seeking speed
const ATTACK_DURATION = 0.6; // seconds from entering vision to explosion
const EXPLOSION_RADIUS = 40;

export class Ghost {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.state = 'seeking'; // 'seeking' | 'attacking' | 'exploding' | 'dead'
    this.attackTimer = 0;
    this._shakePhase = Math.random() * Math.PI * 2;

    this.display = new PIXI.Container();
    this.display.x = x;
    this.display.y = y;

    this.gfx = new PIXI.Graphics();
    this.display.addChild(this.gfx);
    this._drawGhost(0xccccff, 0.5);
  }

  _drawGhost(color, alpha) {
    const g = this.gfx;
    g.clear();

    // Body — wispy oval
    g.beginFill(color, alpha);
    g.drawEllipse(0, 0, 10, 14);
    g.endFill();

    // Head
    g.beginFill(color, alpha * 1.2);
    g.drawCircle(0, -10, 6);
    g.endFill();

    // Eyes — dark pits
    g.beginFill(0x000000, alpha);
    g.drawCircle(-2.5, -11, 1.5);
    g.drawCircle(2.5, -11, 1.5);
    g.endFill();

    // Wispy tail
    g.beginFill(color, alpha * 0.6);
    g.moveTo(-6, 8);
    g.lineTo(-8, 16);
    g.lineTo(-2, 14);
    g.lineTo(2, 18);
    g.lineTo(6, 14);
    g.lineTo(10, 16);
    g.lineTo(8, 8);
    g.closePath();
    g.endFill();
  }

  update(dt, playerX, playerY, visionRadius, visionX, visionY) {
    if (this.state === 'dead') return null;

    const inVision = this._isInVision(visionX, visionY, visionRadius);

    if (this.state === 'seeking') {
      // Move toward player
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        this.x += (dx / dist) * GHOST_SPEED * dt;
        this.y += (dy / dist) * GHOST_SPEED * dt;
      }
      this.display.x = this.x;
      this.display.y = this.y;

      // Gentle float
      this.display.y += Math.sin(this._shakePhase) * 0.3;
      this._shakePhase += dt * 2;

      if (inVision) {
        this.state = 'attacking';
        this.attackTimer = 0;
      }

      return null;
    }

    if (this.state === 'attacking') {
      this.attackTimer += dt;
      const t = this.attackTimer / ATTACK_DURATION;

      // Turn red progressively
      const red = Math.floor(0xcc + t * 0x33);
      const green = Math.floor(0xcc * (1 - t));
      const blue = Math.floor(0xff * (1 - t * 0.8));
      const color = (red << 16) | (green << 8) | blue;
      this._drawGhost(color, 0.5 + t * 0.4);

      // Shake erratically
      const shakeAmp = t * 8;
      this.display.x = this.x + (Math.random() - 0.5) * shakeAmp;
      this.display.y = this.y + (Math.random() - 0.5) * shakeAmp;

      // Grow
      const scale = 1 + t * 2.5;
      this.display.scale.set(scale);

      if (this.attackTimer >= ATTACK_DURATION) {
        this.state = 'exploding';
        return { type: 'ghostExplode', x: this.x, y: this.y, inVision };
      }

      return null;
    }

    return null;
  }

  _isInVision(vx, vy, vr) {
    const dx = this.x - vx;
    const dy = this.y - vy;
    return Math.sqrt(dx * dx + dy * dy) <= vr;
  }

  setVisible(v) {
    this.display.visible = v;
  }
}
