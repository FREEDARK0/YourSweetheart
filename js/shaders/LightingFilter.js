const fragSrc = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform vec2 uLightPos;
  uniform float uLightRadius;
  uniform vec2 uInputSize;
  uniform float uAmbient;

  void main() {
    vec4 texColor = texture2D(uSampler, vTextureCoord);
    vec2 pixelCoord = vTextureCoord * uInputSize;
    float dist = length(pixelCoord - uLightPos);
    float t = smoothstep(uLightRadius, uLightRadius * 0.3, dist);
    float light = uAmbient + (1.0 - uAmbient) * (1.0 - t);
    // subtle rim glow at light edge
    float glow = smoothstep(uLightRadius * 0.85, uLightRadius * 1.08, dist) * 0.10;
    light = min(1.0, light + glow);
    gl_FragColor = texColor * vec4(light, light, light, 1.0);
  }
`;

export class LightingFilter extends PIXI.Filter {
  constructor(lightX, lightY, radius, screenW, screenH) {
    super(null, fragSrc, {
      uLightPos:   new Float32Array([lightX, lightY]),
      uLightRadius: radius,
      uInputSize:  new Float32Array([screenW, screenH]),
      uAmbient:    0.03,
    });
  }

  update(lightX, lightY, radius, screenW, screenH) {
    this.uniforms.uLightPos[0] = lightX;
    this.uniforms.uLightPos[1] = lightY;
    this.uniforms.uLightRadius = radius;
    this.uniforms.uInputSize[0] = screenW;
    this.uniforms.uInputSize[1] = screenH;
  }
}
