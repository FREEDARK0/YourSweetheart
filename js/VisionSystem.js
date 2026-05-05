/**
 * 手电筒视野系统 — 全屏暗黑遮罩 + 圆形挖孔（hole-punch）跟随鼠标。
 * 支持动态半径（示爱阶段缩小）和辉光环颜色切换。
 */
export class VisionSystem {
  constructor(app, overlayContainer, x, y, radius) {
    this.app = app;
    this.container = overlayContainer;
    this.radius = radius;       // base normal radius
    this.currentRadius = radius; // actual displayed radius (interpolated)
    this.targetRadius = radius;  // target to interpolate toward
    this.x = x;
    this.y = y;

    // Glow color
    this._glowColor = 0x333333;
    this._glowAlpha = 0.25;

    // Dark overlay with a circular hole
    this.darkness = new PIXI.Graphics();
    this.container.addChild(this.darkness);

    // Soft-edge glow ring (drawn separately on top)
    this.glowRing = new PIXI.Graphics();
    this.container.addChild(this.glowRing);

    this._redraw(app.screen.width, app.screen.height);
  }

  _redraw(w, h) {
    const r = this.currentRadius;
    // Extend rect beyond canvas so the hole is always fully contained
    const pad = r + 100;
    const x0 = -pad;
    const y0 = -pad;
    const ww = w + pad * 2;
    const hh = h + pad * 2;

    // Darkness: oversized black rect with a circular hole
    this.darkness.clear();
    this.darkness.beginFill(0x000000, 0.97);
    this.darkness.drawRect(x0, y0, ww, hh);
    this.darkness.beginHole();
    this.darkness.drawCircle(this.x, this.y, r);
    this.darkness.endHole();
    this.darkness.endFill();

    // Glow at hole edge
    this.glowRing.clear();
    this.glowRing.lineStyle(2, this._glowColor, this._glowAlpha);
    this.glowRing.drawCircle(this.x, this.y, r);
    this.glowRing.lineStyle(1, this._glowColor, this._glowAlpha * 0.5);
    this.glowRing.drawCircle(this.x, this.y, r + 3);
  }

  update(x, y) {
    this.x = x;
    this.y = y;
    // Smoothly interpolate current radius toward target
    this.currentRadius += (this.targetRadius - this.currentRadius) * 0.08;
    if (Math.abs(this.targetRadius - this.currentRadius) < 0.5) {
      this.currentRadius = this.targetRadius;
    }
    this.radius = this.currentRadius;
    this._redraw(this.app.screen.width, this.app.screen.height);
  }

  resize(w, h, radius) {
    this.radius = radius;
    this.targetRadius = radius;
    this.currentRadius = radius;
    this._redraw(w, h);
  }

  reset() {
    this.currentRadius = this.radius;
    this.targetRadius = this.radius;
    this._glowColor = 0x333333;
    this._glowAlpha = 0.25;
    this._redraw(this.app.screen.width, this.app.screen.height);
  }

  /** Set target radius — current radius smoothly interpolates toward it. */
  setTargetRadius(r) {
    this.targetRadius = r;
  }

  /** Immediately set radius (no interpolation). */
  setRadius(r) {
    this.radius = r;
    this.currentRadius = r;
    this.targetRadius = r;
    this._redraw(this.app.screen.width, this.app.screen.height);
  }

  /** Set glow ring color. */
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
