const TILE_SIZE = 256;

/**
 * 生成格子地砖纹理 + 法线贴图，返回 PIXI.TilingSprite 铺满全屏。
 * 地面 Sprite 可单独应用带法线贴图的 LightingFilter 实现逐像素光照。
 */
export class GroundRenderer {
  /**
   * @returns {{ ground: PIXI.TilingSprite, normalTex: PIXI.Texture }}
   */
  static create(screenW, screenH) {
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = TILE_SIZE;
    colorCanvas.height = TILE_SIZE;
    const cctx = colorCanvas.getContext('2d');

    // --- 绘制砖块图案 ---
    const brickW = TILE_SIZE / 4;   // 64
    const brickH = TILE_SIZE / 8;   // 32
    const mortar = 3;

    cctx.fillStyle = '#1a1a1a';
    cctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    for (let row = 0; row < 8; row++) {
      const offset = (row % 2) * brickW / 2;
      for (let col = -1; col < 5; col++) {
        const bx = col * brickW + offset;
        const by = row * brickH;
        // Random slight shade variation per brick
        const shade = 30 + Math.floor(((row * 7 + col * 13) % 7) * 5);
        cctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        cctx.fillRect(bx + mortar/2, by + mortar/2, brickW - mortar, brickH - mortar);
      }
    }

    // --- 生成法线贴图 ---
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = TILE_SIZE;
    normalCanvas.height = TILE_SIZE;
    const nctx = normalCanvas.getContext('2d');

    const imageData = cctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    const pixels = imageData.data;
    const normalData = nctx.createImageData(TILE_SIZE, TILE_SIZE);

    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        // Sobel on luminance
        const tl = luminance(pixels, x-1, y-1, TILE_SIZE);
        const t  = luminance(pixels, x,   y-1, TILE_SIZE);
        const tr = luminance(pixels, x+1, y-1, TILE_SIZE);
        const l  = luminance(pixels, x-1, y,   TILE_SIZE);
        const r  = luminance(pixels, x+1, y,   TILE_SIZE);
        const bl = luminance(pixels, x-1, y+1, TILE_SIZE);
        const b  = luminance(pixels, x,   y+1, TILE_SIZE);
        const br = luminance(pixels, x+1, y+1, TILE_SIZE);

        const gx = (tr + 2*r + br) - (tl + 2*l + bl);
        const gy = (bl + 2*b + br) - (tl + 2*t + tr);

        const strength = 4.0; // 法线强度
        const nx = -gx * strength / 255.0;
        const ny = -gy * strength / 255.0;
        const nz = 1.0;
        const len = Math.sqrt(nx*nx + ny*ny + nz*nz);

        const idx = (y * TILE_SIZE + x) * 4;
        normalData.data[idx]     = ((nx/len + 1.0) * 0.5 * 255) | 0;
        normalData.data[idx + 1] = ((ny/len + 1.0) * 0.5 * 255) | 0;
        normalData.data[idx + 2] = ((nz/len) * 255) | 0;
        normalData.data[idx + 3] = 255;
      }
    }

    nctx.putImageData(normalData, 0, 0);

    // --- 创建 PixiJS 纹理 ---
    const colorTex = PIXI.Texture.from(colorCanvas);
    const normalTex = PIXI.Texture.from(normalCanvas);

    const ground = new PIXI.TilingSprite(colorTex, screenW, screenH);
    ground.tileScale.set(1.5); // 放大瓷砖使其更明显

    return { ground, normalTex };
  }
}

function luminance(pixels, x, y, size) {
  if (x < 0 || y < 0 || x >= size || y >= size) return 0;
  const idx = (y * size + x) * 4;
  return pixels[idx] * 0.299 + pixels[idx+1] * 0.587 + pixels[idx+2] * 0.114;
}
