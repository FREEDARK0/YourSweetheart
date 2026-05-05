const fragSrc = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform vec2 uLightPos;
  uniform float uLightRadius;
  uniform vec2 uInputSize;

  void main() {
    vec2 pixelCoord = vTextureCoord * uInputSize;
    float dist = length(pixelCoord - uLightPos);
    float t = smoothstep(uLightRadius, uLightRadius * 0.25, dist);
    // subtle glow ring at the light edge
    float glow = smoothstep(uLightRadius * 0.85, uLightRadius * 1.05, dist) * 0.08;
    float alpha = max(t, glow);
    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
  }
`;

export class LightingFilter extends PIXI.Filter {
  constructor(lightX, lightY, radius, screenW, screenH) {
    super(null, fragSrc, {
      uLightPos:   new Float32Array([lightX, lightY]),
      uLightRadius: radius,
      uInputSize:  new Float32Array([screenW, screenH]),
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
