/**
 * Jumpscare 惊吓效果管理器
 * 序列：闪红 → 全屏血红 + 屏幕震动 + 画面 → 重新开始按钮
 */
export class JumpscareManager {
  constructor(app, container, onRestart) {
    this.app = app;
    this.container = container;
    this.onRestart = onRestart;
    this.elapsed = 0;
    this.active = false;
    this._shakeOffset = { x: 0, y: 0 };
  }

  trigger() {
    if (this.active) return;
    this.active = true;
    this.elapsed = 0;
    this.container.removeChildren();

    // Red flash overlay
    this.flash = new PIXI.Graphics();
    this.container.addChild(this.flash);

    // Main scare graphics
    this.scareContainer = new PIXI.Container();
    this.scareContainer.visible = false;
    this.container.addChild(this.scareContainer);

    // Blood-red background
    this.scareBg = new PIXI.Graphics();
    this.scareBg.beginFill(0x8b0000);
    this.scareBg.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    this.scareBg.endFill();
    this.scareContainer.addChild(this.scareBg);

    // Vignette effect
    const vignette = new PIXI.Graphics();
    vignette.beginFill(0x000000, 0.6);
    vignette.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    vignette.beginHole();
    vignette.drawEllipse(
      this.app.screen.width / 2,
      this.app.screen.height / 2,
      this.app.screen.width * 0.6,
      this.app.screen.height * 0.6
    );
    vignette.endHole();
    vignette.endFill();
    this.scareContainer.addChild(vignette);

    // Scare face placeholder — large menacing eyes
    const face = new PIXI.Graphics();
    // Left eye
    face.beginFill(0xff1111, 0.9);
    face.drawCircle(this.app.screen.width / 2 - 60, this.app.screen.height / 2 - 30, 28);
    face.endFill();
    face.beginFill(0x000000);
    face.drawCircle(this.app.screen.width / 2 - 60, this.app.screen.height / 2 - 30, 12);
    face.endFill();
    // Right eye
    face.beginFill(0xff1111, 0.9);
    face.drawCircle(this.app.screen.width / 2 + 60, this.app.screen.height / 2 - 30, 28);
    face.endFill();
    face.beginFill(0x000000);
    face.drawCircle(this.app.screen.width / 2 + 60, this.app.screen.height / 2 - 30, 12);
    face.endFill();
    // Grin
    face.lineStyle(4, 0xff0000);
    face.arc(this.app.screen.width / 2, this.app.screen.height / 2 + 30, 40, 0.1, Math.PI - 0.1);
    face.lineStyle(0);
    this.scareContainer.addChild(face);

    // Text
    this.scareText = new PIXI.Text('捉到你了 ♥', {
      fontFamily: 'Kurobara',
      fontSize: 48,
      fill: '#ff1111',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.scareText.anchor.set(0.5);
    this.scareText.x = this.app.screen.width / 2;
    this.scareText.y = this.app.screen.height / 2 + 120;
    this.scareContainer.addChild(this.scareText);

    // Restart button
    this.restartBtn = new PIXI.Container();
    this.restartBtn.visible = false;
    this.restartBtn.interactive = true;
    this.restartBtn.cursor = 'pointer';

    const btnBg = new PIXI.Graphics();
    btnBg.beginFill(0x330000);
    btnBg.drawRoundedRect(-80, -22, 160, 44, 8);
    btnBg.endFill();
    btnBg.lineStyle(2, 0x660000);
    btnBg.drawRoundedRect(-80, -22, 160, 44, 8);
    this.restartBtn.addChild(btnBg);

    const btnText = new PIXI.Text('重新开始', {
      fontFamily: 'Kurobara',
      fontSize: 20,
      fill: '#cc3333',
    });
    btnText.anchor.set(0.5);
    this.restartBtn.addChild(btnText);

    this.restartBtn.x = this.app.screen.width / 2;
    this.restartBtn.y = this.app.screen.height / 2 + 190;
    this.restartBtn.on('pointertap', () => {
      this.reset();
      this.onRestart();
    });
    this.container.addChild(this.restartBtn);

    // Start update tick
    this._ticker = (dt) => this._update(dt);
    this.app.ticker.add(this._ticker);
  }

  _update(dt) {
    this.elapsed += dt * (1000 / 60); // convert to ms

    if (this.elapsed < 200) {
      // Phase 1: rapid red flash
      const flashAlpha = Math.abs(Math.sin(this.elapsed * 0.05)) * 0.8;
      this.flash.clear();
      this.flash.beginFill(0xff0000, flashAlpha);
      this.flash.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
      this.flash.endFill();
    } else if (this.elapsed < 500) {
      // Phase 2: transition to scare image
      this.flash.visible = false;
      this.scareContainer.visible = true;
    } else if (this.elapsed < 3000) {
      // Phase 3: screen shake
      this._shakeOffset.x = (Math.random() - 0.5) * 12 * (1 - this.elapsed / 3000);
      this._shakeOffset.y = (Math.random() - 0.5) * 10 * (1 - this.elapsed / 3000);
      this.scareContainer.x = this._shakeOffset.x;
      this.scareContainer.y = this._shakeOffset.y;

      if (this.elapsed > 1500) {
        this.restartBtn.visible = true;
      }
    } else {
      // Shake done
      this.scareContainer.x = 0;
      this.scareContainer.y = 0;
      this.restartBtn.visible = true;
    }

    // Pulsing text
    if (this.scareText) {
      const pulse = 1 + Math.sin(this.elapsed * 0.01) * 0.08;
      this.scareText.scale.set(pulse);
    }
  }

  reset() {
    this.active = false;
    this.elapsed = 0;
    this.container.removeChildren();
    if (this._ticker) {
      this.app.ticker.remove(this._ticker);
      this._ticker = null;
    }
  }
}
