const fragSrc = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform vec2 uLightPosNorm;
  uniform float uLightRadiusNorm;
  uniform float uAspect;

  void main() {
    vec2 delta = vTextureCoord - uLightPosNorm;
    delta.x *= uAspect;
    float dist = length(delta);
    float t = smoothstep(uLightRadiusNorm * 0.2, uLightRadiusNorm, dist);
    float glow = smoothstep(uLightRadiusNorm * 0.85, uLightRadiusNorm * 1.05, dist) * 0.08;
    float alpha = max(t, glow);
    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
  }
`;

export class LightingFilter extends PIXI.Filter {
  constructor(lightX, lightY, radius, screenW, screenH) {
    const minDim = Math.min(screenW, screenH);
    super(null, fragSrc, {
      uLightPosNorm:   new Float32Array([lightX / screenW, lightY / screenH]),
      uLightRadiusNorm: radius / minDim,
      uAspect:         screenW / Math.max(1, screenH),
    });
  }

  update(lightX, lightY, radius, screenW, screenH) {
    const minDim = Math.min(screenW, screenH);
    this.uniforms.uLightPosNorm[0] = lightX / screenW;
    this.uniforms.uLightPosNorm[1] = lightY / screenH;
    this.uniforms.uLightRadiusNorm = radius / minDim;
    this.uniforms.uAspect = screenW / Math.max(1, screenH);
  }
}
