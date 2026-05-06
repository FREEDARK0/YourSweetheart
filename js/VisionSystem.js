const MAX_CANDLES = 8;

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

const FRAGMENT_SRC = `
#define MAX_CANDLES ${MAX_CANDLES}

precision mediump float;
varying vec2 vScreenPos;
uniform vec2 uLightPos;
uniform float uLightRadius;
uniform vec2 uCandlePos[MAX_CANDLES];
uniform float uCandleRadius[MAX_CANDLES];

void main() {
    vec2 delta = vScreenPos - uLightPos;
    float dist = length(delta);

    float hotspot = smoothstep(0.0, uLightRadius * 0.7, dist) * 0.10;
    float cutoff = smoothstep(uLightRadius * 0.2, uLightRadius, dist);
    float glow = smoothstep(uLightRadius * 0.88, uLightRadius * 1.05, dist) * 0.06;

    float alpha = max(max(hotspot, cutoff), glow);

    for (int i = 0; i < MAX_CANDLES; i++) {
        vec2 cDelta = vScreenPos - uCandlePos[i];
        float cDist = length(cDelta);
        float r = max(uCandleRadius[i], 0.001);
        float cAlpha = smoothstep(r * 0.55, r, cDist);
        alpha = min(alpha, cAlpha);
    }

    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
}
`;

let _sharedProgram = null;
function getProgram() {
  if (!_sharedProgram) {
    _sharedProgram = PIXI.Program.from(VERTEX_SRC, FRAGMENT_SRC);
  }
  return _sharedProgram;
}

/**
 * 手电筒视野系统 — 使用自定义 PIXI.Shader 直接渲染全屏 Mesh，
 * 支持多个蜡烛光源（candle apertures）。
 */
export class VisionSystem {
  constructor(app, overlayContainer, x, y, radius) {
    this.app = app;
    this.container = overlayContainer;
    this.radius = radius;
    this.currentRadius = radius;
    this.targetRadius = radius;
    this.x = x;
    this.y = y;

    this._glowColor = 0x333333;
    this._glowAlpha = 0.25;

    const w = app.screen.width;
    const h = app.screen.height;

    this._shader = new PIXI.Shader(getProgram(), {
      uLightPos:      new Float32Array([x, y]),
      uLightRadius:   radius,
      uCandlePos:     new Float32Array(MAX_CANDLES * 2),
      uCandleRadius:  new Float32Array(MAX_CANDLES),
    });
    // Initialize inactive candle slots
    for (let i = 0; i < MAX_CANDLES; i++) {
      this._shader.uniforms.uCandleRadius[i] = 0.001;
    }

    this.darkness = this._createMesh(w, h);
    this.container.addChild(this.darkness);

    this.glowRing = new PIXI.Graphics();
    this.container.addChild(this.glowRing);
  }

  _createMesh(w, h) {
    const geometry = new PIXI.Geometry()
      .addAttribute('aVertexPosition', [0, 0, w, 0, w, h, 0, h], 2)
      .addIndex([0, 1, 2, 0, 2, 3]);
    return new PIXI.Mesh(geometry, this._shader);
  }

  /**
   * Must be called BEFORE update() each frame.
   * Populates candle uniform arrays; update()'s scalar assignment triggers GPU upload.
   */
  setCandles(candleList) {
    const pos = this._shader.uniforms.uCandlePos;
    const rad = this._shader.uniforms.uCandleRadius;
    const count = Math.min(candleList.length, MAX_CANDLES);

    for (let i = 0; i < count; i++) {
      pos[i * 2] = candleList[i].x;
      pos[i * 2 + 1] = candleList[i].y;
      rad[i] = Math.max(candleList[i].currentRadius, 0.001);
    }
    for (let i = count; i < MAX_CANDLES; i++) {
      pos[i * 2] = 0;
      pos[i * 2 + 1] = 0;
      rad[i] = 0.001;
    }
  }

  update(x, y) {
    this.x = x;
    this.y = y;

    this.currentRadius += (this.targetRadius - this.currentRadius) * 0.08;
    if (Math.abs(this.targetRadius - this.currentRadius) < 0.5) {
      this.currentRadius = this.targetRadius;
    }
    this.radius = this.currentRadius;

    this._shader.uniforms.uLightPos[0] = x;
    this._shader.uniforms.uLightPos[1] = y;
    this._shader.uniforms.uLightRadius = this.currentRadius;

    this.glowRing.clear();
    this.glowRing.lineStyle(2, this._glowColor, this._glowAlpha);
    this.glowRing.drawCircle(x, y, this.currentRadius);
    this.glowRing.lineStyle(1, this._glowColor, this._glowAlpha * 0.5);
    this.glowRing.drawCircle(x, y, this.currentRadius + 3);
  }

  resize(w, h, radius) {
    this.radius = radius;
    this.targetRadius = radius;
    this.currentRadius = radius;

    this.container.removeChild(this.darkness);
    this.darkness.destroy();
    this.darkness = this._createMesh(w, h);
    this.container.addChildAt(this.darkness, 0);

    this._shader.uniforms.uLightPos[0] = this.x;
    this._shader.uniforms.uLightPos[1] = this.y;
    this._shader.uniforms.uLightRadius = radius;
  }

  reset() {
    this.currentRadius = this.radius;
    this.targetRadius = this.radius;
    this._glowColor = 0x333333;
    this._glowAlpha = 0.25;
  }

  setTargetRadius(r) {
    this.targetRadius = r;
  }

  setRadius(r) {
    this.radius = r;
    this.currentRadius = r;
    this.targetRadius = r;
    this._shader.uniforms.uLightPos[0] = this.x;
    this._shader.uniforms.uLightPos[1] = this.y;
    this._shader.uniforms.uLightRadius = r;
  }

  setGlowColor(color, alpha) {
    this._glowColor = color;
    this._glowAlpha = alpha;
  }

  isInVision(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.currentRadius;
  }

  /** Check if (x,y) is inside any placed candle light. */
  isInCandleLight(x, y, extraLights) {
    for (const light of extraLights) {
      const dx = x - light.x;
      const dy = y - light.y;
      if (Math.sqrt(dx * dx + dy * dy) <= light.radius) return true;
    }
    return false;
  }
}
