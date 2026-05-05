import { Game } from './Game.js';

(async () => {
  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  document.body.appendChild(app.view);

  const texture = await PIXI.Assets.load('assets/girl.png');

  new Game(app, texture);
})();
