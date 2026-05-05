const NPC_SIZE = 28;

/**
 * NPC 实体 — 病娇少女（占位图形绘制）
 * 预留 `sprite` 属性替换为真实素材。
 */
export class NPC {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 120; // px/s
    this._visible = true;

    this.display = new PIXI.Container();
    this.display.x = x;
    this.display.y = y;
    this._draw();
  }

  _draw() {
    this.gfx = new PIXI.Graphics();
    this.display.addChild(this.gfx);
    this._redrawGfx();
  }

  _redrawGfx() {
    const g = this.gfx;
    g.clear();

    // Shadow
    g.beginFill(0x000000, 0.4);
    g.drawEllipse(0, NPC_SIZE * 0.7, NPC_SIZE * 0.6, NPC_SIZE * 0.2);
    g.endFill();

    // Body — dark dress
    g.beginFill(0x1a1a2e);
    g.moveTo(-8, -4);
    g.lineTo(-10, 16);
    g.lineTo(10, 16);
    g.lineTo(8, -4);
    g.closePath();
    g.endFill();

    // Dress flare
    g.beginFill(0x1a1a2e);
    g.moveTo(-10, 16);
    g.lineTo(-14, 22);
    g.lineTo(14, 22);
    g.lineTo(10, 16);
    g.closePath();
    g.endFill();

    // Head
    g.beginFill(0xf5e6d3);
    g.drawCircle(0, -8, 7);
    g.endFill();

    // Hair — long black hair (back layer)
    g.beginFill(0x0d0d0d);
    g.moveTo(-7, -14);
    g.lineTo(-9, -2);
    g.lineTo(-8, 8);
    g.lineTo(-5, 2);
    g.lineTo(-5, -8);
    g.closePath();
    g.moveTo(5, -8);
    g.lineTo(5, 2);
    g.lineTo(8, 8);
    g.lineTo(9, -2);
    g.lineTo(7, -14);
    g.closePath();
    // Hair top
    g.drawEllipse(0, -13, 7.5, 5);
    // Side bangs
    g.moveTo(-7, -13);
    g.lineTo(-8, -8);
    g.lineTo(-5, -7);
    g.closePath();
    g.moveTo(7, -13);
    g.lineTo(8, -8);
    g.lineTo(5, -7);
    g.closePath();
    g.endFill();

    // Eyes — red, wide
    g.beginFill(0xff1111);
    g.drawEllipse(-3, -9, 2, 2.5);
    g.drawEllipse(3, -9, 2, 2.5);
    g.endFill();
    // Eye shine
    g.beginFill(0xffffff);
    g.drawCircle(-2.5, -10, 0.8);
    g.drawCircle(3.5, -10, 0.8);
    g.endFill();

    // Mouth — tiny smile
    g.lineStyle(0.8, 0xcc6666);
    g.arc(0, -5, 2, 0.2, Math.PI - 0.2);
    g.endFill();
    g.lineStyle(0);

    // Red ribbon in hair
    g.beginFill(0xcc1111);
    g.drawEllipse(6, -14, 3, 1.5);
    g.endFill();
  }

  setVisible(v) {
    this._visible = v;
    this.display.visible = v;
  }
}
