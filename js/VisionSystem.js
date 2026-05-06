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

function buildFragmentSrc(candles) {
  let candleLogic = '';
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const r = Math.max(c.currentRadius, 1);
    candleLogic += `  alpha = min(alpha, smoothstep(${(r * 0.2).toFixed(1)}, ${r.toFixed(1)}, length(vScreenPos - vec2(${c.x.toFixed(1)}, ${c.y.toFixed(1)}))));\n`;
  }
  return `precision mediump float;
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
${candleLogic}
    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
}`;
}

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

    this._lastCandleHash = '';

    const w = app.screen.width;
    const h = app.screen.height;

    this._build(x, y, radius, []);

    this.glowRing = new PIXI.Graphics();
    this.container.addChild(this.glowRing);
  }

  _build(x, y, radius, candles) {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    const fragSrc = buildFragmentSrc(candles);
    const program = new PIXI.Program(VERTEX_SRC, fragSrc);
    this._shader = new PIXI.Shader(program, {
      uLightPos:    new Float32Array([x, y]),
      uLightRadius: radius,
    });

    if (!this.darkness) {
      const geometry = new PIXI.Geometry()
        .addAttribute('aVertexPosition', [0, 0, w, 0, w, h, 0, h], 2)
        .addIndex([0, 1, 2, 0, 2, 3]);
      this.darkness = new PIXI.Mesh(geometry, this._shader);
      this.container.addChildAt(this.darkness, 0);
    } else {
      // Hot-swap shader on existing mesh
      this.darkness.shader = this._shader;
    }
  }

  setCandles(candleList) {
    this._candleRings = candleList; // for ring drawing in update()

    let hash = candleList.length;
    for (const c of candleList) {
      hash += `|${c.x.toFixed(0)},${c.y.toFixed(0)}`;
    }
    if (hash === this._lastCandleHash) return;
    this._lastCandleHash = hash;

    this._build(this.x, this.y, this.currentRadius, candleList);
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
    // Main vision ring (gray)
    this.glowRing.lineStyle(2, this._glowColor, this._glowAlpha);
    this.glowRing.drawCircle(x, y, this.currentRadius);
    this.glowRing.lineStyle(1, this._glowColor, this._glowAlpha * 0.5);
    this.glowRing.drawCircle(x, y, this.currentRadius + 3);
    // Candle rings (orange)
    if (this._candleRings) {
      for (const c of this._candleRings) {
        this.glowRing.lineStyle(2, 0xff8844, 0.4);
        this.glowRing.drawCircle(c.x, c.y, c.currentRadius);
      }
    }
  }

  resize(w, h, radius) {
    this.radius = radius;
    this.targetRadius = radius;
    this.currentRadius = radius;

    // Force mesh recreation for new screen size
    if (this.darkness) {
      this.container.removeChild(this.darkness);
      this.darkness.destroy({ children: true });
      this.darkness = null;
    }
    this._lastCandleHash = '';
    this._build(this.x, this.y, radius, []);
  }

  reset() {
    this.currentRadius = this.radius;
    this.targetRadius = this.radius;
    this._glowColor = 0x333333;
    this._glowAlpha = 0.25;
  }

  setTargetRadius(r) { this.targetRadius = r; }

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

  isInCandleLight(x, y, extraLights) {
    for (const light of extraLights) {
      const dx = x - light.x;
      const dy = y - light.y;
      if (Math.sqrt(dx * dx + dy * dy) <= light.radius) return true;
    }
    return false;
  }
}
