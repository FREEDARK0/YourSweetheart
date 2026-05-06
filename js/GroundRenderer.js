const TILE_SIZE = 256;
const GRID = 8;
const CELL = TILE_SIZE / GRID;
const GAP = 1;

// ── Shared vertex shader (identical to VisionSystem) ──
const VERTEX_SRC = `
attribute vec2 aVertexPosition;
uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
varying vec2 vScreenPos;

void main(void) {
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
    vScreenPos = aVertexPosition;
}
`;

// ── Fragment shader: tile + normal-map lighting in CSS pixel coordinates ──
const FRAGMENT_SRC = `
precision mediump float;
varying vec2 vScreenPos;
uniform sampler2D uColorTex;
uniform sampler2D uNormalTex;
uniform vec2 uLightPos;
uniform float uLightRadius;
uniform float uAmbient;
uniform float uTilePx;

void main() {
    vec2 tiledUV = vScreenPos / uTilePx;
    vec4 texColor = texture2D(uColorTex, tiledUV);

    vec3 normal = texture2D(uNormalTex, tiledUV).rgb * 2.0 - 1.0;

    vec2 delta = vScreenPos - uLightPos;
    float dist = length(delta);
    float distNorm = dist / max(uLightRadius, 0.001);

    // Normal strength fades toward edge
    float normalStr = 1.0 - smoothstep(0.15, 0.65, distNorm);
    vec3 blendedNormal = mix(vec3(0.0, 0.0, 1.0), normal, normalStr);

    // Contrast fades toward edge
    float contrastStr = 1.0 - smoothstep(0.10, 0.60, distNorm) * 0.92;
    float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    texColor.rgb = mix(vec3(gray), texColor.rgb, contrastStr);

    // Lighting
    vec2 lightDir2D = normalize(vec2(-delta.x, -delta.y));
    float NdotL = max(0.0, dot(blendedNormal, vec3(lightDir2D, 0.2)));
    float wrap = NdotL * 0.55 + 0.45;

    float t = smoothstep(uLightRadius * 0.3, uLightRadius, dist);
    float attenuation = 1.0 - t;

    float light = uAmbient + (1.0 - uAmbient) * wrap * attenuation;
    light = min(1.0, light);

    gl_FragColor = texColor * vec4(light, light, light, 1.0);
}
`;

let _sharedProgram = null;
function getProgram() {
  if (!_sharedProgram) {
    _sharedProgram = PIXI.Program.from(VERTEX_SRC, FRAGMENT_SRC);
  }
  return _sharedProgram;
}

// ── Cached textures ──
let _colorTex = null;
let _normalTex = null;

function getTextures() {
  if (_colorTex) return { colorTex: _colorTex, normalTex: _normalTex };

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = TILE_SIZE;
  colorCanvas.height = TILE_SIZE;
  const ctx = colorCanvas.getContext('2d');

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

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = TILE_SIZE;
  normalCanvas.height = TILE_SIZE;
  const nctx = normalCanvas.getContext('2d');

  const imageData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
  const pixels = imageData.data;
  const normalData = nctx.createImageData(TILE_SIZE, TILE_SIZE);

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

  _colorTex = PIXI.Texture.from(colorCanvas);
  _normalTex = PIXI.Texture.from(normalCanvas);
  _colorTex.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
  _normalTex.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
  return { colorTex: _colorTex, normalTex: _normalTex };
}

export class GroundRenderer {
  /**
   * Create a full-screen ground Mesh with custom Shader.
   * Returns { mesh, shader } where shader.uniforms can be updated each frame.
   */
  static create(screenW, screenH) {
    const { colorTex, normalTex } = getTextures();

    const shader = new PIXI.Shader(getProgram(), {
      uColorTex:   colorTex,
      uNormalTex:  normalTex,
      uLightPos:   new Float32Array([0, 0]),
      uLightRadius: 100,
      uAmbient:    0.03,
      uTilePx:     TILE_SIZE / 0.75,
    });

    const geometry = new PIXI.Geometry()
      .addAttribute('aVertexPosition', [0, 0, screenW, 0, screenW, screenH, 0, screenH], 2)
      .addIndex([0, 1, 2, 0, 2, 3]);
    const mesh = new PIXI.Mesh(geometry, shader);

    return { mesh, shader };
  }
}

function sample(pixels, x, y, size) {
  if (x < 0 || y < 0 || x >= size || y >= size) return 0;
  const idx = (y * size + x) * 4;
  return pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
}
