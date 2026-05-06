const TILE_SIZE = 256;
const GRID = 4;          // 4×4 checkerboard squares
const CELL = TILE_SIZE / GRID; // 64px per cell
const GAP = 3;           // mortar gap between tiles

export class GroundRenderer {
  static create(screenW, screenH) {
    // --- 绘制棋盘格地砖 ---
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = TILE_SIZE;
    colorCanvas.height = TILE_SIZE;
    const ctx = colorCanvas.getContext('2d');

    // 深色填缝底色
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    const shades = ['#222222', '#2a2a2a', '#262626', '#2e2e2e'];
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const shade = shades[(row + col) % shades.length];
        ctx.fillStyle = shade;
        ctx.fillRect(
          col * CELL + GAP,
          row * CELL + GAP,
          CELL - GAP * 2,
          CELL - GAP * 2
        );
      }
    }

    // --- 生成法线贴图 ---
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = TILE_SIZE;
    normalCanvas.height = TILE_SIZE;
    const nctx = normalCanvas.getContext('2d');

    const imageData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    const pixels = imageData.data;
    const normalData = nctx.createImageData(TILE_SIZE, TILE_SIZE);

    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        // 使用更大的采样核检测瓷砖边缘
        const halfKernel = 4;
        const gx = sampleLum(pixels, x + halfKernel, y, TILE_SIZE)
                 - sampleLum(pixels, x - halfKernel, y, TILE_SIZE);
        const gy = sampleLum(pixels, x, y + halfKernel, TILE_SIZE)
                 - sampleLum(pixels, x, y - halfKernel, TILE_SIZE);

        const strength = 3.0;
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

function sampleLum(pixels, x, y, size) {
  if (x < 0 || y < 0 || x >= size || y >= size) return 0;
  const idx = (y * size + x) * 4;
  return pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
}
