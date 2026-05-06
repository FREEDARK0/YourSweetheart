const TILE_SIZE = 256;
const GRID = 8;          // 8×8 square tiles
const CELL = TILE_SIZE / GRID; // 32px per tile
const GAP = 1;           // mortar line width

export class GroundRenderer {
  static create(screenW, screenH) {
    // --- 两色交替棋盘格纹理 ---
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = TILE_SIZE;
    colorCanvas.height = TILE_SIZE;
    const ctx = colorCanvas.getContext('2d');

    // 缝隙底色
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    const dark  = '#1a1a1a';
    const light = '#2c2c2c';

    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? dark : light;
        ctx.fillRect(
          col * CELL + GAP,
          row * CELL + GAP,
          CELL - GAP * 2,
          CELL - GAP * 2
        );
      }
    }

    // --- 法线贴图（与纹理边缘严格对齐） ---
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = TILE_SIZE;
    normalCanvas.height = TILE_SIZE;
    const nctx = normalCanvas.getContext('2d');

    const imageData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    const pixels = imageData.data;
    const normalData = nctx.createImageData(TILE_SIZE, TILE_SIZE);

    // 2px 采样核匹配 1px 缝隙
    const K = 2;
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const gx = sample(pixels, x + K, y, TILE_SIZE)
                 - sample(pixels, x - K, y, TILE_SIZE);
        const gy = sample(pixels, x, y + K, TILE_SIZE)
                 - sample(pixels, x, y - K, TILE_SIZE);

        const strength = 2.2;
        const nx = -gx * strength / 255.0;
        const ny = -gy * strength / 255.0;
        const nz = 1.0;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

        const idx = (y * TILE_SIZE + x) * 4;
        normalData.data[idx]     = ((nx / len + 1.0) * 127.5) | 0;
        normalData.data[idx + 1] = ((ny / len + 1.0) * 127.5) | 0;
        normalData.data[idx + 2] = ((nz / len) * 255) | 0;
        normalData.data[idx + 3] = 255;
      }
    }

    nctx.putImageData(normalData, 0, 0);

    // --- PixiJS 纹理 ---
    const colorTex = PIXI.Texture.from(colorCanvas);
    const normalTex = PIXI.Texture.from(normalCanvas);
    normalTex.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;

    const ground = new PIXI.TilingSprite(colorTex, screenW, screenH);
    ground.tileScale.set(1.5);

    return { ground, normalTex };
  }
}

function sample(pixels, x, y, size) {
  if (x < 0 || y < 0 || x >= size || y >= size) return 0;
  const idx = (y * size + x) * 4;
  return pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
}
