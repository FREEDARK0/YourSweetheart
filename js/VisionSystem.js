import { LightingFilter } from './shaders/LightingFilter.js';

/**
 * 手电筒视野系统 — 使用自定义 GLSL Shader 实现软边光照衰减。
 * 黑暗遮罩使用 Sprite + Texture.WHITE，避免 Graphics.filterArea 的 DPR 坐标偏移问题。
 */
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

    // 全屏黑色遮罩（Sprite，避免 Graphics filterArea 的 DPR 坐标偏移）
    this.darkness = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.darkness.width = w;
    this.darkness.height = h;
    this.darkness.tint = 0x000000;

    // 应用 shader 光照过滤器
    this.filter = new LightingFilter(x, y, radius, w, h);
    this.darkness.filters = [this.filter];

    this.container.addChild(this.darkness);

    // 软辉光环（Graphics 绘制，叠加在 shader 光圈之上）
    this.glowRing = new PIXI.Graphics();
    this.container.addChild(this.glowRing);
  }

  update(x, y) {
    this.x = x;
    this.y = y;

    this.currentRadius += (this.targetRadius - this.currentRadius) * 0.08;
    if (Math.abs(this.targetRadius - this.currentRadius) < 0.5) {
      this.currentRadius = this.targetRadius;
    }
    this.radius = this.currentRadius;

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // 更新 shader uniform
    this.filter.update(x, y, this.currentRadius, w, h);

    // 辉光环
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
    this.filter.update(this.x, this.y, radius, w, h);
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
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.filter.update(this.x, this.y, r, w, h);
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
