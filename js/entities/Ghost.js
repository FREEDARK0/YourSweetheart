const SKULL_WIDTH = 48;
const GHOST_SPEED = 70;
const ATTACK_DURATION = 0.6;
const EXPLOSION_RADIUS = 200;
const TRAIL_LENGTH = 14;

export class Ghost {
  constructor(x, y, skullTex) {
    this.x = x;
    this.y = y;
    this.state = 'seeking'; // 'seeking' | 'attacking' | 'exploding' | 'dead'
    this.attackTimer = 0;

    // Trail history
    this._trail = [];
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      this._trail.push({ x, y });
    }

    this.display = new PIXI.Container();

    // Trail (behind sprite)
    this.trailGfx = new PIXI.Graphics();
    this.display.addChild(this.trailGfx);

    // Skull sprite (image faces left by default)
    this.sprite = new PIXI.Sprite(skullTex);
    this.sprite.anchor.set(0.5);
    this.sprite.scale.set(SKULL_WIDTH / skullTex.width);
    this.display.addChild(this.sprite);

    this.display.x = x;
    this.display.y = y;
  }

  update(dt, playerX, playerY, visionRadius, visionX, visionY) {
    if (this.state === 'dead') return null;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Face player (skull image faces left, so add PI to compensate)
    this.sprite.rotation = Math.atan2(dy, dx) + Math.PI;

    if (this.state === 'seeking') {
      if (dist > 1) {
        this.x += (dx / dist) * GHOST_SPEED * dt;
        this.y += (dy / dist) * GHOST_SPEED * dt;
      }

      if (dist <= EXPLOSION_RADIUS) {
        this.state = 'attacking';
        this.attackTimer = 0;
      }

      this.display.scale.set(1);
      this.sprite.tint = 0xffffff;

      this._updateTrail();
      this._drawTrail(0x44ccaa);
      this.display.x = this.x;
      this.display.y = this.y;
      return null;
    }

    if (this.state === 'attacking') {
      this.attackTimer += dt;
      const t = Math.min(1, this.attackTimer / ATTACK_DURATION);

      // Tint from white → red
      const gb = Math.floor(255 * (1 - t));
      this.sprite.tint = (255 << 16) | (gb << 8) | gb;

      // Shake
      const shakeAmp = t * 7;
      this.display.x = this.x + (Math.random() - 0.5) * shakeAmp;
      this.display.y = this.y + (Math.random() - 0.5) * shakeAmp;

      // Grow
      this.display.scale.set(1 + t * 2.2);

      this._updateTrail();
      this._drawTrail(0xff4444);

      if (this.attackTimer >= ATTACK_DURATION) {
        this.state = 'exploding';
        const inVision = this._isInVision(visionX, visionY, visionRadius);
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

  _drawTrail(color) {
    const g = this.trailGfx;
    g.clear();
    const len = this._trail.length;
    for (let i = 0; i < len; i++) {
      const t = this._trail[i];
      const progress = 1 - i / len;
      const alpha = progress * 0.25;
      const radius = progress * 5;
      g.beginFill(color, alpha);
      g.drawCircle(t.x - this.x, t.y - this.y, radius);
      g.endFill();
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
