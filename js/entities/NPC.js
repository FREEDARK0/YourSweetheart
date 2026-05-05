const ANIM_FPS = 6;
const FRAME_TIME = 1 / ANIM_FPS;
const TARGET_HEIGHT = 96;

export class NPC {
  constructor(x, y, textures) {
    this.x = x;
    this.y = y;
    this.speed = 120;
    this._visible = true;

    this._direction = 'down';
    this._moving = false;
    this._animTimer = 0;
    this._animFrame = 0;

    this._frames = this._buildFrames(textures);

    this.sprite = new PIXI.Sprite(this._frames.idle[0]);
    this.sprite.anchor.set(0.5, 0.85);

    const scale = TARGET_HEIGHT / textures.idle.height;
    this.sprite.scale.set(scale);

    this.display = new PIXI.Container();
    this.display.x = x;
    this.display.y = y;
    this.display.addChild(this.sprite);
  }

  _buildFrames(textures) {
    const frames = {
      idle: [textures.idle],
      down: [],
      up: [],
      right: [],
    };

    for (const [key, tex] of [
      ['down', textures.moveDown],
      ['up', textures.moveUp],
      ['right', textures.moveRight],
    ]) {
      const bw = tex.baseTexture.width;
      const bh = tex.baseTexture.height;
      const fw = bw / 3;
      for (let i = 0; i < 3; i++) {
        frames[key].push(
          new PIXI.Texture(tex.baseTexture, new PIXI.Rectangle(i * fw, 0, fw, bh))
        );
      }
    }

    return frames;
  }

  updateAnimation(dt, dx, dy) {
    const speed = Math.sqrt(dx * dx + dy * dy);

    if (speed < 0.5) {
      this._moving = false;
      this._animFrame = 0;
      this._animTimer = 0;
      this.sprite.texture = this._frames.idle[0];
      this.sprite.scale.x = Math.abs(this.sprite.scale.x);
    } else {
      this._moving = true;

      if (Math.abs(dx) > Math.abs(dy)) {
        this._direction = dx > 0 ? 'right' : 'left';
      } else {
        this._direction = dy > 0 ? 'down' : 'up';
      }

      if (this._direction === 'left') {
        this.sprite.scale.x = -Math.abs(this.sprite.scale.x);
        this._advanceAnim(dt, 'right');
      } else {
        this.sprite.scale.x = Math.abs(this.sprite.scale.x);
        this._advanceAnim(dt, this._direction);
      }
    }
  }

  _advanceAnim(dt, key) {
    this._animTimer += dt;
    const frames = this._frames[key];
    while (this._animTimer >= FRAME_TIME) {
      this._animTimer -= FRAME_TIME;
      this._animFrame = (this._animFrame + 1) % frames.length;
    }
    this.sprite.texture = frames[this._animFrame];
  }

  setVisible(v) {
    this._visible = v;
    this.display.visible = v;
  }
}
