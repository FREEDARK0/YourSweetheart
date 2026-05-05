const BLOOD_COLORS = [
  0xcc0000, 0x990000, 0x770000, 0xaa1111, 0x880000,
  0x660000, 0xbb2200, 0x550000, 0xcc1100, 0x800000,
];

const GRAVITY = 400;

export class BloodSplatter {
  constructor(container) {
    this._particleLayer = new PIXI.Container();
    container.addChild(this._particleLayer);

    this._stainGfx = new PIXI.Graphics();
    container.addChild(this._stainGfx);

    this._particles = [];
  }

  emit(x, y) {
    // Main spray: 30-45 fast radial particles
    const sprayCount = 30 + Math.floor(Math.random() * 15);
    for (let i = 0; i < sprayCount; i++) {
      this._spawn(x, y, 100 + Math.random() * 280, 1 + Math.random() * 4.5, true);
    }

    // Secondary splatter: 10-20 wider, slower
    const splatCount = 10 + Math.floor(Math.random() * 10);
    for (let i = 0; i < splatCount; i++) {
      this._spawn(x, y, 30 + Math.random() * 100, 1.5 + Math.random() * 5, true);
    }

    // Central pool drops: 5-8 large, slow
    const poolCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < poolCount; i++) {
      this._spawn(x, y, 5 + Math.random() * 30, 3 + Math.random() * 6, false);
    }
  }

  _spawn(x, y, speed, size, isSpray) {
    const angle = Math.random() * Math.PI * 2;
    // Bias upward slightly for initial burst
    const vyBias = isSpray ? -0.3 : 0;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle) + vyBias;
    const len = Math.sqrt(dirX * dirX + dirY * dirY);

    const gfx = new PIXI.Graphics();
    const color = BLOOD_COLORS[Math.floor(Math.random() * BLOOD_COLORS.length)];
    gfx.beginFill(color, 0.85);
    gfx.drawEllipse(0, 0, size, size * 0.55);
    gfx.endFill();

    const p = {
      x, y,
      vx: (dirX / len) * speed,
      vy: (dirY / len) * speed,
      life: 0.3 + Math.random() * 0.7,
      maxLife: 0.3 + Math.random() * 0.7,
      size,
      color,
      gfx,
      alive: true,
      isSpray,
    };

    gfx.x = x;
    gfx.y = y;
    gfx.rotation = Math.random() * Math.PI;

    this._particleLayer.addChild(gfx);
    this._particles.push(p);
  }

  update(dt) {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      if (!p.alive) continue;

      p.life -= dt;

      if (p.life <= 0) {
        // Leave permanent stain on ground
        const stainAlpha = 0.15 + Math.random() * 0.35;
        this._stainGfx.beginFill(p.color, stainAlpha);
        this._stainGfx.drawEllipse(p.x, p.y, p.size * 1.8, p.size * 0.9);
        this._stainGfx.endFill();

        // Smaller satellite stains around the main one
        if (p.isSpray && Math.random() < 0.4) {
          const sx = p.x + (Math.random() - 0.5) * p.size * 3;
          const sy = p.y + (Math.random() - 0.5) * p.size * 3;
          this._stainGfx.beginFill(p.color, stainAlpha * 0.6);
          this._stainGfx.drawEllipse(sx, sy, p.size * 0.8, p.size * 0.4);
          this._stainGfx.endFill();
        }

        // Remove particle
        this._particleLayer.removeChild(p.gfx);
        p.gfx.destroy();
        this._particles.splice(i, 1);
        continue;
      }

      // Physics
      p.vy += GRAVITY * dt;
      p.vx *= 0.965;
      p.vy *= 0.965;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Fade slightly near end of life
      const lifeRatio = p.life / p.maxLife;
      p.gfx.alpha = lifeRatio < 0.2 ? lifeRatio / 0.2 * 0.85 : 0.85;
      p.gfx.x = p.x;
      p.gfx.y = p.y;
    }
  }

  clear() {
    for (const p of this._particles) {
      this._particleLayer.removeChild(p.gfx);
      p.gfx.destroy();
    }
    this._particles = [];
    this._stainGfx.clear();
  }
}
