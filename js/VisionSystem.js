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
  // Embed candle data directly in shader source — bypass uniform system entirely
  let decl = '';
  let logic = '';
  if (candles && candles.length > 0) {
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      decl += `uniform vec2 uC${i}Pos;\n`;
      decl += `uniform float uC${i}Radius;\n`;
      logic += `  { vec2 d = vScreenPos - uC${i}Pos; float r = max(uC${i}Radius, 0.001); alpha = min(alpha, smoothstep(r * 0.2, r, length(d))); }\n`;
    }
  }
  return `
precision mediump float;
varying vec2 vScreenPos;
uniform vec2 uLightPos;
uniform float uLightRadius;
${decl}
void main() {
    vec2 delta = vScreenPos - uLightPos;
    float dist = length(delta);
    float hotspot = smoothstep(0.0, uLightRadius * 0.7, dist) * 0.10;
    float cutoff = smoothstep(uLightRadius * 0.2, uLightRadius, dist);
    float glow = smoothstep(uLightRadius * 0.88, uLightRadius * 1.05, dist) * 0.06;
    float alpha = max(max(hotspot, cutoff), glow);
${logic}
    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
}
`;
}

function buildProgram(candles) {
  return PIXI.Program.from(VERTEX_SRC, buildFragmentSrc(candles));
}

function buildUniforms(x, y, radius, candles) {
  const u = {
    uLightPos:  new Float32Array([x, y]),
    uLightRadius: radius,
  };
  if (candles) {
    for (let i = 0; i < candles.length; i++) {
      u[`uC${i}Pos`] = new Float32Array([candles[i].x, candles[i].y]);
      u[`uC${i}Radius`] = Math.max(candles[i].currentRadius, 0.001);
    }
  }
  return u;
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

    this._candleCount = 0;
    this._rebuild(x, y, radius, []);

    this.glowRing = new PIXI.Graphics();
    this.container.addChild(this.glowRing);
  }

  _rebuild(x, y, radius, candles) {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    const program = buildProgram(candles);
    const uniforms = buildUniforms(x, y, radius, candles);
    this._shader = new PIXI.Shader(program, uniforms);
    this._candleCount = candles.length;

    if (this.darkness) {
      this.container.removeChild(this.darkness);
      this.darkness.destroy();
    }
    this.darkness = this._createMesh(w, h);
    this.container.addChildAt(this.darkness, 0);
  }

  _createMesh(w, h) {
    const geometry = new PIXI.Geometry()
      .addAttribute('aVertexPosition', [0, 0, w, 0, w, h, 0, h], 2)
      .addIndex([0, 1, 2, 0, 2, 3]);
    return new PIXI.Mesh(geometry, this._shader);
  }

  setCandles(candleList) {
    if (candleList.length !== this._candleCount) {
      // Rebuild shader with matching uniform count
      this._rebuild(this.x, this.y, this.currentRadius, candleList);
      return;
    }
    // Same count: update existing uniforms
    for (let i = 0; i < candleList.length; i++) {
      const c = candleList[i];
      this._shader.uniforms[`uC${i}Pos`] = new Float32Array([c.x, c.y]);
      this._shader.uniforms[`uC${i}Radius`] = Math.max(c.currentRadius, 0.001);
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
