const TARGET_WIDTH = 100;
const BOB_AMPLITUDE = 5;
const BOB_FREQ = 2.5;
const BOB_RETURN = 6;

export class NPC {
  constructor(x, y, texture) {
    this.x = x;
    this.y = y;
    this.speed = 120;
    this._visible = true;

    this._direction = 'down';
    this._moving = false;
    this._bobTime = 0;
    this._bobOffset = 0;

    const scale = TARGET_WIDTH / texture.width;

    this.display = new PIXI.Container();
    this.display.x = x;
    this.display.y = y;

    // 动态投射影子（Graphics 绘制）
    this._shadowGfx = new PIXI.Graphics();
    this.display.addChild(this._shadowGfx);

    // 主体精灵
    this.sprite = new PIXI.Sprite(texture);
    this.sprite.anchor.set(0.5, 0.85);
    this.sprite.scale.set(scale);
    this.display.addChild(this.sprite);

    this._spriteWorldW = texture.width * scale;
    this._spriteWorldH = texture.height * scale;
  }

  updateAnimation(dt, dx, dy) {
    const speed = Math.sqrt(dx * dx + dy * dy);

    if (speed < 0.5) {
      this._moving = false;
      this._bobOffset += (0 - this._bobOffset) * Math.min(1, BOB_RETURN * dt);
      this._bobTime = 0;
    } else {
      this._moving = true;

      if (Math.abs(dx) > Math.abs(dy)) {
        this._direction = dx > 0 ? 'right' : 'left';
      } else {
        this._direction = dy > 0 ? 'down' : 'up';
      }

      if (this._direction === 'left') {
        this.sprite.scale.x = -Math.abs(this.sprite.scale.x);
      } else {
        this.sprite.scale.x = Math.abs(this.sprite.scale.x);
      }

      this._bobTime += dt;
      this._bobOffset = Math.sin(this._bobTime * BOB_FREQ * Math.PI * 2) * BOB_AMPLITUDE;
    }

    this.sprite.y = this._bobOffset;
  }

  updateShadow(lightX, lightY) {
    const dx = this.x - lightX;
    const dy = this.y - lightY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this._shadowGfx.clear();

    if (dist < 1) return;

    // 投射方向：远离光源
    const castX = dx / dist;
    const castY = dy / dist;
    const castAngle = Math.atan2(castY, castX);

    // 影子长度：光源越近影子越长
    const shadowLen = Math.min(130, 60 + 180 / Math.max(20, dist));

    // 影子中心在投射方向上偏移
    const offsetX = castX * shadowLen * 0.35;
    const offsetY = castY * shadowLen * 0.35 + this._bobOffset + 6;

    // 椭圆半宽和半高（沿投射方向拉长）
    const halfW = shadowLen * 0.45;
    const halfH = 18;

    // 核心阴影
    this._shadowGfx.beginFill(0x000000, 0.50);
    this._shadowGfx.drawEllipse(offsetX, offsetY, halfW, halfH);
    this._shadowGfx.endFill();

    // 外围柔化
    this._shadowGfx.beginFill(0x000000, 0.22);
    this._shadowGfx.drawEllipse(offsetX, offsetY, halfW * 1.25, halfH * 1.4);
    this._shadowGfx.endFill();

    // 最外层淡出
    this._shadowGfx.beginFill(0x000000, 0.08);
    this._shadowGfx.drawEllipse(offsetX, offsetY, halfW * 1.5, halfH * 1.8);
    this._shadowGfx.endFill();
  }

  isInVision(vision) {
    const scale = Math.abs(this.sprite.scale.y);
    const halfW = this.sprite.texture.width * scale / 2;
    const h = this.sprite.texture.height * scale;

    const screenY = this.y + this._bobOffset;
    const top = screenY - h * this.sprite.anchor.y;
    const bottom = screenY + h * (1 - this.sprite.anchor.y);
    const left = this.x - halfW;
    const right = this.x + halfW;

    const cx = Math.max(left, Math.min(vision.x, right));
    const cy = Math.max(top, Math.min(vision.y, bottom));
    const dx = cx - vision.x;
    const dy = cy - vision.y;
    return Math.sqrt(dx * dx + dy * dy) <= vision.currentRadius;
  }

  setVisible(v) {
    this._visible = v;
    this.display.visible = v;
  }
}
