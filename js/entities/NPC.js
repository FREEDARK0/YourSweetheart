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

    // 鼠标↔NPC 方向
    const dirX = dx / dist;
    const dirY = dy / dist;
    const angle = Math.atan2(dy, dx);

    // 拉伸/偏移程度：0（鼠标紧贴）→ 1（鼠标很远）
    const t = Math.min(1.0, dist / 350);

    // 椭圆沿鼠标方向拉长
    const halfW = 26 + t * 55;
    const halfH = 12 + t * 1;

    // 椭圆中心向鼠标方向偏移
    const offsetX = dirX * t * 28;
    const offsetY = dirY * t * 28;

    // 两层渐变
    this._shadowGfx.beginFill(0x000000, 0.30);
    this._shadowGfx.drawEllipse(0, 0, halfW * 1.2, halfH * 1.6);
    this._shadowGfx.endFill();

    this._shadowGfx.beginFill(0x000000, 0.55);
    this._shadowGfx.drawEllipse(0, 0, halfW, halfH);
    this._shadowGfx.endFill();

    this._shadowGfx.rotation = angle;
    this._shadowGfx.x = offsetX;
    this._shadowGfx.y = offsetY + this._bobOffset + 8;
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
