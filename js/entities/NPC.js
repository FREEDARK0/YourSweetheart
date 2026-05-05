const TARGET_WIDTH = 100;
const BOB_AMPLITUDE = 5;
const BOB_FREQ = 2.5;      // oscillations per second while moving
const BOB_RETURN = 6;    // lerp speed when returning to center

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

    this.sprite = new PIXI.Sprite(texture);
    this.sprite.anchor.set(0.5, 0.85);

    const scale = TARGET_WIDTH / texture.width;
    this.sprite.scale.set(scale);

    this.display = new PIXI.Container();
    this.display.x = x;
    this.display.y = y;
    this.display.addChild(this.sprite);
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
