const ITEM_SIZE = 14;
const BOX_WIDTH = 44;

const THRESHOLDS = {
  box: 1.0,
  portrait: 0.5,
  bottle: 0.5,
  heart: 0.5,
  candle: 0.5,
};

const COLORS = {
  box:     { main: 0x4a2810, accent: 0x8b0000, glow: 0x660000 },
  portrait:{ main: 0x3a3a0a, accent: 0x8b8b00, glow: 0x666600 },
  bottle:  { main: 0x1a3a1a, accent: 0x228b22, glow: 0x004400 },
  heart:   { main: 0x4a0a1a, accent: 0xff3388, glow: 0x660022 },
  candle:  { main: 0x3a2010, accent: 0xff8844, glow: 0x663300 },
};

export class Item {
  constructor(type, x, y, boxTex) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.gazeTimer = 0;
    this.threshold = THRESHOLDS[type] || 0.5;
    this.active = true;
    this._visible = false;
    this._glowPhase = Math.random() * Math.PI * 2;

    this.display = new PIXI.Container();
    this.display.x = x;
    this.display.y = y;

    if (type === 'box' && boxTex) {
      this._sprite = new PIXI.Sprite(boxTex);
      this._sprite.anchor.set(0.5);
      this._sprite.scale.set(BOX_WIDTH / boxTex.width);
      this.display.addChild(this._sprite);
    } else {
      this.gfx = new PIXI.Graphics();
      this._drawShape(this.gfx, COLORS[this.type]);
      this.display.addChild(this.gfx);
    }

    // Ambient glow
    this.glow = new PIXI.Graphics();
    this.display.addChild(this.glow);

    // Gaze progress ring
    this.progressRing = new PIXI.Graphics();
    this.display.addChild(this.progressRing);
  }

  _drawShape(g, c) {
    const s = ITEM_SIZE;
    g.clear();

    switch (this.type) {
      case 'portrait': {
        g.beginFill(c.accent, 0.3);
        g.drawRect(-s, -s * 0.8, s * 2, s * 2.2);
        g.endFill();
        g.lineStyle(2, c.accent, 0.7);
        g.drawRect(-s, -s * 0.8, s * 2, s * 2.2);
        g.lineStyle(0);
        g.beginFill(c.main, 0.5);
        g.drawEllipse(0, -s * 0.1, s * 0.5, s * 0.7);
        g.endFill();
        g.beginFill(c.accent);
        g.drawCircle(-s * 0.25, -s * 0.2, 1.2);
        g.drawCircle(s * 0.25, -s * 0.2, 1.2);
        g.endFill();
        break;
      }
      case 'bottle': {
        g.beginFill(c.main);
        g.drawRoundedRect(-s * 0.6, -s * 0.2, s * 1.2, s * 1.8, 2);
        g.endFill();
        g.beginFill(c.main);
        g.drawRect(-s * 0.25, -s * 1.0, s * 0.5, s * 0.9);
        g.endFill();
        g.lineStyle(1.5, c.accent, 0.7);
        g.drawRoundedRect(-s * 0.35, -s * 1.1, s * 0.7, s * 0.25, 1);
        g.lineStyle(0);
        g.beginFill(c.accent, 0.4);
        g.drawRoundedRect(-s * 0.5, s * 0.3, s * 1.0, s * 0.8, 1);
        g.endFill();
        break;
      }
      case 'heart': {
        g.beginFill(c.accent, 0.85);
        const hs = s / 10;
        g.moveTo(0, -2 * hs);
        g.bezierCurveTo(-5 * hs, -5 * hs, -10 * hs, -1 * hs, -10 * hs, 3 * hs);
        g.bezierCurveTo(-10 * hs, 7 * hs, -5 * hs, 9 * hs, 0, 12 * hs);
        g.bezierCurveTo(5 * hs, 9 * hs, 10 * hs, 7 * hs, 10 * hs, 3 * hs);
        g.bezierCurveTo(10 * hs, -1 * hs, 5 * hs, -5 * hs, 0, -2 * hs);
        g.endFill();
        break;
      }
      case 'candle': {
        g.beginFill(c.main);
        g.drawRoundedRect(-s * 0.15, -s * 0.4, s * 0.3, s * 1.0, 1);
        g.endFill();
        g.beginFill(c.accent);
        g.drawEllipse(0, -s * 0.5, s * 0.12, s * 0.32);
        g.endFill();
        g.beginFill(0xffdd66);
        g.drawEllipse(0, -s * 0.52, s * 0.06, s * 0.18);
        g.endFill();
        break;
      }
    }
  }

  update(dt, inVision) {
    if (!this.active) return null;

    this._glowPhase += dt * 2;

    if (inVision) {
      this.gazeTimer += dt;
      this._updateProgressRing();

      if (this.gazeTimer >= this.threshold) {
        this.active = false;
        return 'activate';
      }
    } else {
      this.gazeTimer = Math.max(0, this.gazeTimer - dt * 0.3);
    }

    // Pulsing glow when being looked at
    if (this.gazeTimer > 0 && inVision) {
      const pulse = 0.5 + Math.sin(this._glowPhase * 3) * 0.3;
      const glowRadius = this.type === 'box' ? BOX_WIDTH * 0.7 : ITEM_SIZE * 1.6;
      this.glow.clear();
      this.glow.beginFill(COLORS[this.type].glow, 0.25 + pulse * 0.2);
      this.glow.drawCircle(0, 0, glowRadius + pulse * 3);
      this.glow.endFill();
      this.glow.alpha = Math.min(1, this.gazeTimer / this.threshold);
    } else {
      this.glow.clear();
      this.glow.alpha = 0;
    }

    return null;
  }

  _updateProgressRing() {
    const progress = this.gazeTimer / this.threshold;
    this.progressRing.clear();
    if (progress > 0.01) {
      const radius = this.type === 'box' ? BOX_WIDTH * 0.6 : ITEM_SIZE + 4;
      const angle = -Math.PI / 2 + progress * Math.PI * 2;
      this.progressRing.lineStyle(2, COLORS[this.type].accent, 0.7);
      this.progressRing.arc(0, 0, radius, -Math.PI / 2, angle);
      this.progressRing.lineStyle(0);
    }
  }

  setVisible(v) {
    this._visible = v;
    this.display.visible = v;
  }
}
