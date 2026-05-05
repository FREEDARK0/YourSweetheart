const PARTICLE_LIFETIME = 1200; // ms
const SPAWN_RATE = 80; // ms between spawns
const HEART_SIZE = 9;

/**
 * 心形粒子动效 — 在 NPC 周围冒出心形粒子，用于示爱阶段。
 */
export class HeartParticles {
  constructor(container) {
    this.container = container;
    this.particles = [];
    this._spawnTimer = 0;
    this._active = false;
    this._targetX = 0;
    this._targetY = 0;
  }

  start(x, y) {
    this._active = true;
    this._targetX = x;
    this._targetY = y;
    this._spawnTimer = 0;
  }

  stop() {
    this._active = false;
  }

  setPosition(x, y) {
    this._targetX = x;
    this._targetY = y;
  }

  update(dtMs) {
    if (this._active) {
      this._spawnTimer += dtMs;
      while (this._spawnTimer >= SPAWN_RATE) {
        this._spawnTimer -= SPAWN_RATE;
        this._spawnParticle();
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.elapsed += dtMs;
      const progress = p.elapsed / PARTICLE_LIFETIME;

      p.gfx.x = p.x + p.vx * (p.elapsed / 1000);
      p.gfx.y = p.y + p.vy * (p.elapsed / 1000) + 0.5 * 30 * (p.elapsed / 1000) ** 2;
      p.gfx.alpha = Math.max(0, 1 - progress);
      p.gfx.scale.set(0.5 + (1 - progress) * 0.5);

      if (p.elapsed >= PARTICLE_LIFETIME) {
        this.container.removeChild(p.gfx);
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  _spawnParticle() {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
    const speed = 20 + Math.random() * 40;
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 10 - 20;

    const gfx = new PIXI.Graphics();
    this._drawHeart(gfx, HEART_SIZE);
    gfx.x = this._targetX + offsetX;
    gfx.y = this._targetY + offsetY;

    this.container.addChild(gfx);
    this.particles.push({
      gfx,
      x: gfx.x,
      y: gfx.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      elapsed: 0,
    });
  }

  _drawHeart(g, size) {
    const s = size / 12;
    g.beginFill(0xff3388, 0.9);
    g.moveTo(0, -3 * s);
    // Left lobe
    g.bezierCurveTo(-6 * s, -6 * s, -12 * s, -2 * s, -12 * s, 2 * s);
    g.bezierCurveTo(-12 * s, 6 * s, -6 * s, 8 * s, 0, 12 * s);
    // Right lobe (mirrored)
    g.bezierCurveTo(6 * s, 8 * s, 12 * s, 6 * s, 12 * s, 2 * s);
    g.bezierCurveTo(12 * s, -2 * s, 6 * s, -6 * s, 0, -3 * s);
    g.endFill();
  }

  clear() {
    for (const p of this.particles) {
      this.container.removeChild(p.gfx);
      p.gfx.destroy();
    }
    this.particles = [];
    this._active = false;
  }
}
