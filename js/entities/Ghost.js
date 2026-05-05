const GHOST_SPEED = 70;
const ATTACK_DURATION = 0.6;
const TRAIL_LENGTH = 14;       // number of trail positions
const WISP_COUNT = 6;          // will-o'-wisp particles
const WISP_RADIUS = 16;        // orbit radius around skull

export class Ghost {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.state = 'seeking'; // 'seeking' | 'attacking' | 'exploding' | 'dead'
    this.attackTimer = 0;
    this._phase = Math.random() * Math.PI * 2;

    // Trail history
    this._trail = [];
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this._trail.push({ x, y });
    }

    // Will-o'-wisp particles
    this._wisps = [];
    for (let i = 0; i < WISP_COUNT; i++) {
      this._wisps.push({
        angle: (i / WISP_COUNT) * Math.PI * 2 + Math.random() * 0.5,
        speed: 1.5 + Math.random() * 2,
        radius: WISP_RADIUS * (0.6 + Math.random() * 0.4),
        size: 2 + Math.random() * 3,
      });
    }

    this.display = new PIXI.Container();
    // Trail gfx (rendered first so it's behind)
    this.trailGfx = new PIXI.Graphics();
    this.display.addChild(this.trailGfx);
    // Main skull gfx
    this.skullGfx = new PIXI.Graphics();
    this.display.addChild(this.skullGfx);
    // Wisp gfx
    this.wispGfx = new PIXI.Graphics();
    this.display.addChild(this.wispGfx);

    this._color = 0x4488aa; // base teal-blue
    this._drawSkull(this._color, 0.7);
    this._drawWisps(0x44ccaa);
  }

  // ---- Drawing ----

  _drawSkull(color, alpha) {
    const g = this.skullGfx;
    g.clear();
    const s = 9; // base scale

    // Cranium
    g.beginFill(color, alpha);
    g.drawEllipse(0, -1, s * 0.9, s * 1.0);
    g.endFill();

    // Cheekbones / jaw
    g.beginFill(color, alpha * 0.9);
    g.moveTo(-s * 0.75, -2);
    g.lineTo(-s * 0.6, s * 0.1);
    g.lineTo(-s * 0.4, s * 0.6);
    g.lineTo(-s * 0.15, s * 0.4);
    g.lineTo(0, s * 0.7);
    g.lineTo(s * 0.15, s * 0.4);
    g.lineTo(s * 0.4, s * 0.6);
    g.lineTo(s * 0.6, s * 0.1);
    g.lineTo(s * 0.75, -2);
    g.closePath();
    g.endFill();

    // Left eye socket
    g.beginFill(0x000000, alpha);
    g.drawEllipse(-s * 0.3, -s * 0.15, s * 0.25, s * 0.3);
    g.endFill();
    // Right eye socket
    g.drawEllipse(s * 0.3, -s * 0.15, s * 0.25, s * 0.3);
    g.endFill();

    // Nose hole
    g.beginFill(0x000000, alpha * 0.8);
    g.drawEllipse(0, s * 0.05, s * 0.12, s * 0.15);
    g.endFill();

    // Teeth lines
    g.lineStyle(0.5, 0x000000, alpha * 0.4);
    for (let i = -2; i <= 2; i++) {
      g.moveTo(i * s * 0.12, s * 0.38);
      g.lineTo(i * s * 0.12, s * 0.6);
    }
    g.lineStyle(0);
  }

  _drawWisps(color) {
    const g = this.wispGfx;
    g.clear();
    for (const w of this._wisps) {
      const wx = Math.cos(w.angle) * w.radius;
      const wy = Math.sin(w.angle) * w.radius * 0.7;
      // Soft glow
      g.beginFill(color, 0.15);
      g.drawCircle(wx, wy, w.size * 2.5);
      g.endFill();
      // Core
      g.beginFill(color, 0.55);
      g.drawCircle(wx, wy, w.size);
      g.endFill();
    }
  }

  _drawTrail(color) {
    const g = this.trailGfx;
    g.clear();
    const len = this._trail.length;
    for (let i = 0; i < len; i++) {
      const t = this._trail[i];
      const progress = 1 - i / len; // 1 (newest) → 0 (oldest)
      const alpha = progress * 0.25;
      const radius = progress * 5;
      g.beginFill(color, alpha);
      g.drawCircle(t.x - this.x, t.y - this.y, radius);
      g.endFill();
    }
  }

  // ---- Update ----

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

      // Update wisps
      this._phase += dt * 3;
      for (const w of this._wisps) {
        w.angle += w.speed * dt;
      }

      this._drawSkull(this._color, 0.7);
      this._drawWisps(0x44ccaa);

      if (inVision) {
        this.state = 'attacking';
        this.attackTimer = 0;
      }

      this._updateTrail();
      this._drawTrail(0x44ccaa);
      this.display.x = this.x;
      this.display.y = this.y;
      return null;
    }

    if (this.state === 'attacking') {
      this.attackTimer += dt;
      const t = Math.min(1, this.attackTimer / ATTACK_DURATION); // CLAMPED

      // Color from teal → blood red
      const r = Math.floor(0x44 + t * (0xcc - 0x44));
      const g = Math.floor(0x88 * (1 - t));
      const b = Math.floor(0xaa * (1 - t));
      const color = (r << 16) | (g << 8) | b;
      this._color = color;

      this._drawSkull(color, 0.7 + t * 0.25);
      this._drawWisps(0xff4444);

      // Shake
      const shakeAmp = t * 7;
      const sx = this.x + (Math.random() - 0.5) * shakeAmp;
      const sy = this.y + (Math.random() - 0.5) * shakeAmp;
      this.display.x = sx;
      this.display.y = sy;

      // Grow
      const scale = 1 + t * 2.2;
      this.display.scale.set(scale);

      this._phase += dt * 8;

      this._updateTrail();
      this._drawTrail(0xff4444);

      if (this.attackTimer >= ATTACK_DURATION) {
        this.state = 'exploding';
        return { type: 'ghostExplode', x: this.x, y: this.y, inVision };
      }

      return null;
    }

    return null;
  }

  _updateTrail() {
    this._trail.unshift({ x: this.x, y: this.y });
    if (this._trail.length > TRAIL_LENGTH) {
      this._trail.pop();
    }
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
