// CRT noise filter fragment shader — eerie atmosphere
const CRT_FRAGMENT = `
precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform vec2 uResolution;

float random(vec2 uv) {
  return fract(sin(dot(uv.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vTextureCoord;

  // Subtle chromatic aberration (RGB lateral shift)
  float shift = 0.0018;
  float r = texture2D(uSampler, uv + vec2(shift, 0.0)).r;
  float g = texture2D(uSampler, uv).g;
  float b = texture2D(uSampler, uv - vec2(shift, 0.0)).b;
  vec4 color = vec4(r, g, b, 1.0);

  // Moving noise grain
  float noise = (random(uv * uResolution + uTime * 90.0) - 0.5) * 0.045;

  // Scanlines with subtle flicker
  float scanPos = uv.y * uResolution.y;
  float flicker = sin(uTime * 7.5) * 0.2 + 0.8;
  float scanline = sin(scanPos * 2.2) * 0.028 * flicker;

  // Occasional horizontal glitch band
  float bandRng = random(vec2(floor(uv.y * 55.0), floor(uTime * 3.3)));
  float band = step(0.997, bandRng) * 0.035;

  color.rgb += noise;
  color.rgb -= scanline;
  color.rgb += band;

  // Vignette (darker corners)
  vec2 vig = uv - 0.5;
  float vignette = 1.0 - dot(vig, vig) * 0.33;
  color.rgb *= vignette;

  // Creepy green-shifted tint
  color.r *= 0.94;
  color.b *= 0.82;

  // Subtle brightness wobble
  color.rgb *= 1.0 + sin(uTime * 12.0 + uv.y * 10.0) * 0.012;

  gl_FragColor = color;
}
`;

function createCRTFilter(width, height) {
  return new PIXI.Filter(undefined, CRT_FRAGMENT, {
    uTime: 0,
    uResolution: [width, height],
  });
}

/**
 * Post-processing screen effects framework.
 * Manages a stack of full-screen PIXI.Filter instances applied to the stage.
 */
export class ScreenEffects {
  constructor(app) {
    this.app = app;
    this._effects = {}; // name -> { filter, active }
  }

  /** Enable a named screen effect. Idempotent — calling again is a no-op. */
  enable(name) {
    if (this._effects[name]) {
      this._effects[name].active = true;
      this._apply();
      return;
    }

    let filter;
    switch (name) {
      case 'crt':
        filter = createCRTFilter(this.app.screen.width, this.app.screen.height);
        break;
      default:
        return;
    }

    this._effects[name] = { filter, active: true };
    this._apply();
  }

  /** Disable a named screen effect. */
  disable(name) {
    const entry = this._effects[name];
    if (!entry) return;
    entry.active = false;
    this._apply();
  }

  /** Whether a named effect is currently active. */
  isActive(name) {
    return this._effects[name]?.active === true;
  }

  /** Call every frame. Advances time-based uniforms. */
  update(dt) {
    for (const entry of Object.values(this._effects)) {
      if (!entry.active) continue;
      const u = entry.filter.uniforms;
      if (u && u.uTime !== undefined) {
        u.uTime += dt;
      }
    }
  }

  /** Update resolution uniforms after a resize. */
  resize(w, h) {
    for (const entry of Object.values(this._effects)) {
      const u = entry.filter.uniforms;
      if (u && u.uResolution) {
        u.uResolution[0] = w;
        u.uResolution[1] = h;
      }
    }
  }

  /** Rebuild the stage filter array from active effects. */
  _apply() {
    const active = [];
    for (const entry of Object.values(this._effects)) {
      if (entry.active) active.push(entry.filter);
    }
    this.app.stage.filters = active;
  }

  /** Remove all effects and clear stage filters. */
  clear() {
    this._effects = {};
    this.app.stage.filters = [];
  }
}
