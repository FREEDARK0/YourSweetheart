const TOMBSTONE_THRESHOLD = 0.5; // seconds of gaze to activate

export class Tombstone {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.gazeTimer = 0;
    this.active = true;

    this.display = new PIXI.Container();
    this.display.x = x;
    this.display.y = y;
    this._draw();
  }

  _draw() {
    const g = new PIXI.Graphics();

    // Stone base
    g.beginFill(0x555555);
    g.moveTo(-10, 14);
    g.lineTo(-8, -14);
    g.lineTo(8, -14);
    g.lineTo(10, 14);
    g.closePath();
    g.endFill();

    // Top arch
    g.beginFill(0x666666);
    g.arc(0, -12, 8, Math.PI, 0);
    g.endFill();

    // R.I.P. text
    const text = new PIXI.Text('RIP', {
      fontFamily: 'Kurobara',
      fontSize: 7,
      fill: '#333333',
      fontWeight: 'bold',
    });
    text.anchor.set(0.5);
    text.y = 2;
    this.display.addChild(g);
    this.display.addChild(text);

    // Progress ring container
    this.progressRing = new PIXI.Graphics();
    this.display.addChild(this.progressRing);
  }

  update(dt, inVision) {
    if (!this.active) return null;

    if (inVision) {
      this.gazeTimer += dt;
      this._updateRing();

      if (this.gazeTimer >= TOMBSTONE_THRESHOLD) {
        this.active = false;
        return 'activate';
      }
    } else {
      this.gazeTimer = Math.max(0, this.gazeTimer - dt * 0.3);
    }
    return null;
  }

  _updateRing() {
    const progress = this.gazeTimer / TOMBSTONE_THRESHOLD;
    this.progressRing.clear();
    if (progress > 0.01) {
      this.progressRing.lineStyle(2, 0x888888, 0.6);
      this.progressRing.arc(0, 0, 16, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    }
  }

  setVisible(v) {
    this.display.visible = v;
  }
}
