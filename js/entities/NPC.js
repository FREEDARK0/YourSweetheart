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
    const dx = lightX - this.x;
    const dy = lightY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this._shadowGfx.clear();

    if (dist < 1) return;

    const toLightAngle = Math.atan2(dy, dx);

    // 梯形长度（3x）
    const shadowLen = Math.min(780, 180 + dist * 2.1);

    const baseHalfW = 36;
    const tipHalfW  = 16;
    // 根部椭圆宽度比梯形底宽稍大，防止棱角露出
    const rootHalfW = baseHalfW * 1.15;
    const rootHalfH = 12;

    // ── 统一形状：椭圆根部 + 梯形延伸（三层渐变，每层内形状相同） ──

    // 外层柔化
    this._shadowGfx.beginFill(0x000000, 0.18);
    this._shadowGfx.drawEllipse(0, 0, rootHalfW * 1.35, rootHalfH * 1.35);
    this._shadowGfx.moveTo(-baseHalfW * 1.3, 0);
    this._shadowGfx.lineTo( baseHalfW * 1.3, 0);
    this._shadowGfx.lineTo( tipHalfW * 1.6, -shadowLen);
    this._shadowGfx.lineTo(-tipHalfW * 1.6, -shadowLen);
    this._shadowGfx.closePath();
    this._shadowGfx.endFill();

    // 中层过渡
    this._shadowGfx.beginFill(0x000000, 0.50);
    this._shadowGfx.drawEllipse(0, 0, rootHalfW * 1.1, rootHalfH * 1.1);
    this._shadowGfx.moveTo(-baseHalfW * 1.08, 0);
    this._shadowGfx.lineTo( baseHalfW * 1.08, 0);
    this._shadowGfx.lineTo( tipHalfW * 1.2, -shadowLen);
    this._shadowGfx.lineTo(-tipHalfW * 1.2, -shadowLen);
    this._shadowGfx.closePath();
    this._shadowGfx.endFill();

    // 核心浓黑
    this._shadowGfx.beginFill(0x000000, 0.82);
    this._shadowGfx.drawEllipse(0, 0, rootHalfW, rootHalfH);
    this._shadowGfx.moveTo(-baseHalfW, 0);
    this._shadowGfx.lineTo( baseHalfW, 0);
    this._shadowGfx.lineTo( tipHalfW, -shadowLen);
    this._shadowGfx.lineTo(-tipHalfW, -shadowLen);
    this._shadowGfx.closePath();
    this._shadowGfx.endFill();

    this._shadowGfx.rotation = toLightAngle - Math.PI / 2;
    this._shadowGfx.x = 0;
    this._shadowGfx.y = this._bobOffset + 6;
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
