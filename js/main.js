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

  const [idle, moveDown, moveRight, moveUp] = await Promise.all([
    PIXI.Assets.load('assets/girl_idle.png'),
    PIXI.Assets.load('assets/girl_move_down.png'),
    PIXI.Assets.load('assets/girl_move_right.png'),
    PIXI.Assets.load('assets/girl_move_up.png'),
  ]);

  new Game(app, { idle, moveDown, moveRight, moveUp });
})();
