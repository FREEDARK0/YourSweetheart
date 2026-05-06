import { LightingFilter } from './shaders/LightingFilter.js';

/**
 * 手电筒视野系统 — 使用自定义 GLSL Shader 实现软边光照衰减。
 * 黑暗遮罩使用 PIXI.Mesh + 显式顶点坐标，彻底杜绝 Sprite/filterArea 的 DPR 坐标偏移。
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

    // 全屏 Mesh — 显式指定顶点/UV，不依赖 Sprite bounds 推算
    this.darkness = this._createMesh(w, h);
    this.filter = new LightingFilter(x, y, radius, w, h);
    this.darkness.filters = [this.filter];
    this.container.addChild(this.darkness);

    // 灰色细线环（Graphics，叠加在 shader 光圈之上）
    this.glowRing = new PIXI.Graphics();
    this.container.addChild(this.glowRing);
  }

  _createMesh(w, h) {
    const geometry = new PIXI.Geometry()
      .addAttribute('aVertexPosition', [0, 0, w, 0, w, h, 0, h], 2)
      .addAttribute('aTextureCoord', [0, 0, 1, 0, 1, 1, 0, 1], 2)
      .addIndex([0, 1, 2, 0, 2, 3]);
    const mesh = new PIXI.Mesh(geometry, new PIXI.MeshMaterial(PIXI.Texture.WHITE));
    mesh.tint = 0x000000;
    mesh.filterArea = new PIXI.Rectangle(0, 0, w, h);
    return mesh;
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

    this.filter.update(x, y, this.currentRadius, w, h);

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

    // 重建 Mesh 以匹配新尺寸
    this.container.removeChild(this.darkness);
    this.darkness.destroy();
    this.darkness = this._createMesh(w, h);
    this.darkness.filters = [this.filter];
    this.container.addChildAt(this.darkness, 0);

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
