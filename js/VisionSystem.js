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
precision mediump float;
varying vec2 vScreenPos;
uniform vec2 uLightPos;
uniform float uLightRadius;

void main() {
    vec2 delta = vScreenPos - uLightPos;
    float dist = length(delta);

    float hotspot = smoothstep(0.0, uLightRadius * 0.7, dist) * 0.10;
    float cutoff = smoothstep(uLightRadius * 0.2, uLightRadius, dist);
    float glow = smoothstep(uLightRadius * 0.88, uLightRadius * 1.05, dist) * 0.06;

    float alpha = max(max(hotspot, cutoff), glow);
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
 * Fragment Shader 接收 CSS 像素坐标，与 Graphics 环共用同一坐标系，彻底消除 DPR 偏移。
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
      uLightPos:    new Float32Array([x, y]),
      uLightRadius: radius,
    });

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
}
