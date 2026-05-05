const FADE_DURATION = 2000; // ms

/**
 * 地面文字管理器 — NPC 在场景中留下红色恐怖文字，逐渐透明消失。
 * 支持显示在视野遮罩上方（visibleOutsideVision 选项）。
 */
export class GroundText {
  /**
   * @param {PIXI.Container} belowOverlay — 视野遮罩下方的容器（仅视野内可见）
   * @param {PIXI.Container} aboveOverlay — 视野遮罩上方的容器（始终可见）
   */
  constructor(belowOverlay, aboveOverlay) {
    this.below = belowOverlay;
    this.above = aboveOverlay;
    this.texts = [];
  }

  /**
   * @param {string} content
   * @param {number} x, y
   * @param {object} [opts]
   * @param {number} [opts.fontSize=24]
   * @param {number} [opts.duration=2000]
   * @param {boolean} [opts.visibleOutsideVision=false]
   */
  spawn(content, x, y, opts = {}) {
    const fontSize = opts.fontSize || 24;
    const duration = opts.duration || FADE_DURATION;
    const aboveOverlay = opts.visibleOutsideVision || false;

    const text = new PIXI.Text(content, {
      fontFamily: 'serif',
      fontSize,
      fill: '#cc0000',
      fontWeight: 'bold',
      fontStyle: 'italic',
      stroke: '#330000',
      strokeThickness: 2,
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowDistance: 2,
    });
    text.anchor.set(0.5, 0.5);
    text.x = x;
    text.y = y;
    text.alpha = 1;
    text.rotation = (Math.random() - 0.5) * 0.15;

    const container = aboveOverlay ? this.above : this.below;
    container.addChild(text);
    this.texts.push({ text, container, elapsed: 0, duration });
  }

  update(dtMs) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const entry = this.texts[i];
      entry.elapsed += dtMs;
      const progress = entry.elapsed / entry.duration;
      entry.text.alpha = Math.max(0, 1 - progress);
      entry.text.y -= 0.15 * dtMs / 16;

      if (entry.elapsed >= entry.duration) {
        entry.container.removeChild(entry.text);
        entry.text.destroy();
        this.texts.splice(i, 1);
      }
    }
  }

  clear() {
    for (const entry of this.texts) {
      entry.container.removeChild(entry.text);
      entry.text.destroy();
    }
    this.texts = [];
  }
}
