import { Game } from './Game.js';

(async () => {
  // Load custom font before anything renders
  await document.fonts.load('16px Kurobara');

  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  document.body.appendChild(app.view);

  const [girlTex, boxTex, skullTex] = await Promise.all([
    PIXI.Assets.load('assets/girl.png'),
    PIXI.Assets.load('assets/道具箱.png'),
    PIXI.Assets.load('assets/骷髅.png'),
  ]);

  new Game(app, girlTex, boxTex, skullTex);
})();
