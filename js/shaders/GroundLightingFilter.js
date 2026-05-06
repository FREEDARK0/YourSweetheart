const fragSrc = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform sampler2D uNormalMap;
  uniform vec2 uLightPosNorm;
  uniform float uLightRadiusNorm;
  uniform float uAspect;
  uniform float uAmbient;

  void main() {
    vec4 texColor = texture2D(uSampler, vTextureCoord);
    vec3 normal = texture2D(uNormalMap, vTextureCoord).rgb * 2.0 - 1.0;

    vec2 delta = vTextureCoord - uLightPosNorm;
    delta.x *= uAspect;
    float dist = length(delta);

    // 光照方向（2D，z分量从上方来）
    vec2 lightDir2D = normalize(vec2(-delta.x, -delta.y));
    float NdotL = max(0.0, dot(normal, vec3(lightDir2D, 0.2)));
    float wrap = NdotL * 0.55 + 0.45;

    float t = smoothstep(uLightRadiusNorm, uLightRadiusNorm * 0.3, dist);
    float attenuation = 1.0 - t;

    float light = uAmbient + (1.0 - uAmbient) * wrap * attenuation;
    light = min(1.0, light);

    gl_FragColor = texColor * vec4(light, light, light, 1.0);
  }
`;

export class GroundLightingFilter extends PIXI.Filter {
  constructor(lightX, lightY, radius, screenW, screenH, normalTex) {
    const minDim = Math.min(screenW, screenH);
    super(null, fragSrc, {
      uLightPosNorm:   new Float32Array([lightX / screenW, lightY / screenH]),
      uLightRadiusNorm: radius / minDim,
      uAspect:         screenW / Math.max(1, screenH),
      uAmbient:        0.06,
      uNormalMap:      normalTex,
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
