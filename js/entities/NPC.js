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

    // 影子（半透明黑色剪影，投射在地面上）
    this._shadow = new PIXI.Sprite(texture);
    this._shadow.anchor.set(0.5, 0.85);
    this._shadow.scale.set(scale);
    this._shadow.scale.y *= 0.45; // 稍压扁模拟地面投影
    this._shadow.tint = 0x000000;
    this._shadow.alpha = 0.4;
    this.display.addChild(this._shadow);

    // 主体精灵
    this.sprite = new PIXI.Sprite(texture);
    this.sprite.anchor.set(0.5, 0.85);
    this.sprite.scale.set(scale);
    this.display.addChild(this.sprite);

    // 缓存精灵世界尺寸，供 filter 使用
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

    if (dist < 1) {
      this._shadow.visible = false;
      return;
    }

    // 影子投射方向：远离光源，距离越近影子越长
    const shadowLen = Math.min(90, dist * 0.65);
    const sx = (dx / dist) * shadowLen;
    const sy = (dy / dist) * shadowLen;

    this._shadow.x = sx;
    this._shadow.y = sy + this._bobOffset + 8;
    this._shadow.alpha = 0.50;

    // 沿光源投射方向拉伸影子（不旋转，只拉伸）
    const stretch = 1.0 + shadowLen / 50;
    const castAngle = Math.atan2(dy, dx);
    this._shadow.scale.x = Math.abs(this.sprite.scale.x) * (1.0 + Math.abs(Math.cos(castAngle)) * (stretch - 1.0));
    // Y 方向：垂直压扁 + 顺投射方向的拉伸
    const baseScaleY = Math.abs(this.sprite.scale.y) * 0.45;
    this._shadow.scale.y = baseScaleY * (1.0 + Math.abs(Math.sin(castAngle)) * (stretch - 1.0) * 0.5);
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
