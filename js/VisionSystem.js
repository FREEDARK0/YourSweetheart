/**
 * 手电筒视野系统 — 使用 Sprite Mask 方案。
 * 黑暗遮罩被一个 Mask 容器控制：白底 + 黑色渐变圆 = 在光圈处透明。
 * 主视野和蜡烛光圈都是 Mask 容器内的渐变 Sprite。
 */

const GRADIENT_SIZE = 512; // radial gradient texture resolution

function createGradientTex() {
  const size = GRADIENT_SIZE;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  // Gradient: center opaque black (mask hides darkness), edge transparent (mask shows darkness)
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0,   'rgba(0,0,0,1)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.8)');
  g.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return PIXI.Texture.from(canvas);
}

let _sharedGradientTex = null;
function sharedGradientTex() {
  if (!_sharedGradientTex) _sharedGradientTex = createGradientTex();
  return _sharedGradientTex;
}

export class VisionSystem {
  constructor(app, overlayContainer, x, y, radius) {
    this.app = app;
    this.container = overlayContainer;
    this.radius = radius;
    this.currentRadius = radius;
    this.targetRadius = radius;
    this.x = x;
    this.y = y;

    this._glowColor = 0x333333;
    this._glowAlpha = 0.25;

    const w = app.screen.width;
    const h = app.screen.height;

    // Full-screen black overlay (the thing being masked)
    this.darkness = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.darkness.width = w;
    this.darkness.height = h;
    this.darkness.tint = 0x000000;
    this.container.addChild(this.darkness);

    // Mask container: white background with black gradient "holes"
    this._maskContainer = new PIXI.Container();
    this.container.addChild(this._maskContainer);

    // White full-screen background in mask (darkness visible by default everywhere)
    const whiteBg = new PIXI.Sprite(PIXI.Texture.WHITE);
    whiteBg.width = w;
    whiteBg.height = h;
    this._maskContainer.addChild(whiteBg);

    // Main vision gradient sprite (black center = mask hides darkness = game visible)
    this._mainGradient = new PIXI.Sprite(sharedGradientTex());
    this._mainGradient.anchor.set(0.5);
    this._mainGradient.x = x;
    this._mainGradient.y = y;
    this._updateMainScale();
    this._maskContainer.addChild(this._mainGradient);

    // Candle gradient sprites (reused pool)
    this._candleSprites = [];
    this._maxCandles = 8;
    for (let i = 0; i < this._maxCandles; i++) {
      const s = new PIXI.Sprite(sharedGradientTex());
      s.anchor.set(0.5);
      s.visible = false;
      this._maskContainer.addChild(s);
      this._candleSprites.push(s);
    }

    // Apply mask
    this.darkness.mask = this._maskContainer;

    // Gray glow ring (decorative, outside mask system)
    this.glowRing = new PIXI.Graphics();
    this.container.addChild(this.glowRing);
  }

  _updateMainScale() {
    const s = this.currentRadius / (GRADIENT_SIZE / 2);
    this._mainGradient.scale.set(s);
  }

  setCandles(candleList) {
    for (let i = 0; i < this._maxCandles; i++) {
      const sprite = this._candleSprites[i];
      if (i < candleList.length) {
        const c = candleList[i];
        sprite.visible = true;
        sprite.x = c.x;
        sprite.y = c.y;
        const s = Math.max(c.currentRadius, 1) / (GRADIENT_SIZE / 2);
        sprite.scale.set(s);
      } else {
        sprite.visible = false;
      }
    }
  }

  update(x, y) {
    this.x = x;
    this.y = y;

    this.currentRadius += (this.targetRadius - this.currentRadius) * 0.08;
    if (Math.abs(this.targetRadius - this.currentRadius) < 0.5) {
      this.currentRadius = this.targetRadius;
    }
    this.radius = this.currentRadius;

    this._mainGradient.x = x;
    this._mainGradient.y = y;
    this._updateMainScale();

    this.glowRing.clear();
    this.glowRing.lineStyle(2, this._glowColor, this._glowAlpha);
    this.glowRing.drawCircle(x, y, this.currentRadius);
    this.glowRing.lineStyle(1, this._glowColor, this._glowAlpha * 0.5);
    this.glowRing.drawCircle(x, y, this.currentRadius + 3);
  }

  resize(w, h, radius) {
    this.radius = radius;
    this.targetRadius = radius;
    this.currentRadius = radius;

    this.darkness.width = w;
    this.darkness.height = h;

    // Update white background in mask
    const bg = this._maskContainer.children[0];
    bg.width = w;
    bg.height = h;

    this._mainGradient.x = this.x;
    this._mainGradient.y = this.y;
    this._updateMainScale();
  }

  reset() {
    this.currentRadius = this.radius;
    this.targetRadius = this.radius;
    this._glowColor = 0x333333;
    this._glowAlpha = 0.25;
  }

  setTargetRadius(r) { this.targetRadius = r; }

  setRadius(r) {
    this.radius = r;
    this.currentRadius = r;
    this.targetRadius = r;
    this._updateMainScale();
  }

  setGlowColor(color, alpha) {
    this._glowColor = color;
    this._glowAlpha = alpha;
  }

  isInVision(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.currentRadius;
  }

  isInCandleLight(x, y, extraLights) {
    for (const light of extraLights) {
      const dx = x - light.x;
      const dy = y - light.y;
      if (Math.sqrt(dx * dx + dy * dy) <= light.radius) return true;
    }
    return false;
  }
}
