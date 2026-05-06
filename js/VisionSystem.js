/**
 * 手电筒视野系统 — 使用预渲染径向渐变纹理作为 Sprite Mask，
 * 遮罩和光环都在 PixiJS CSS-pixel 坐标系统内，无 shader 坐标归一化问题。
 */

const GRADIENT_TEX_SIZE = 1024; // texture covers up to 512px radius

function createGradientTex() {
  const size = GRADIENT_TEX_SIZE;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0,   'rgba(255,255,255,0)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.06)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.25)');
  gradient.addColorStop(1,   'rgba(255,255,255,1)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return PIXI.Texture.from(canvas);
}

// Singleton — all VisionSystem instances share the same gradient texture
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

    // 全屏黑色遮罩（被 mask 打孔）
    this.darkness = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.darkness.width = w;
    this.darkness.height = h;
    this.darkness.tint = 0x000000;
    this.container.addChild(this.darkness);

    // 渐变 Mask — 白色中心透明，边缘不透明
    this._maskSprite = new PIXI.Sprite(sharedGradientTex());
    this._maskSprite.anchor.set(0.5);
    this._maskSprite.x = x;
    this._maskSprite.y = y;
    this._updateMaskScale();
    this.container.addChild(this._maskSprite);
    this.darkness.mask = this._maskSprite;

    // 灰色细线环
    this.glowRing = new PIXI.Graphics();
    this.container.addChild(this.glowRing);
  }

  _updateMaskScale() {
    // Gradient texture radius is GRADIENT_TEX_SIZE/2 px.
    // Scale so that edge of gradient aligns with currentRadius.
    const s = this.currentRadius / (GRADIENT_TEX_SIZE / 2);
    this._maskSprite.scale.set(s);
  }

  update(x, y) {
    this.x = x;
    this.y = y;

    this.currentRadius += (this.targetRadius - this.currentRadius) * 0.08;
    if (Math.abs(this.targetRadius - this.currentRadius) < 0.5) {
      this.currentRadius = this.targetRadius;
    }
    this.radius = this.currentRadius;

    this._maskSprite.x = x;
    this._maskSprite.y = y;
    this._updateMaskScale();

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
    this._maskSprite.x = this.x;
    this._maskSprite.y = this.y;
    this._updateMaskScale();
  }

  reset() {
    this.currentRadius = this.radius;
    this.targetRadius = this.radius;
    this._glowColor = 0x333333;
    this._glowAlpha = 0.25;
  }

  setTargetRadius(r) {
    this.targetRadius = r;
  }

  setRadius(r) {
    this.radius = r;
    this.currentRadius = r;
    this.targetRadius = r;
    this._maskSprite.x = this.x;
    this._maskSprite.y = this.y;
    this._updateMaskScale();
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
}
