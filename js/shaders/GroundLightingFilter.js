const fragSrc = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform sampler2D uNormalMap;
  uniform vec2 uLightPosNorm;
  uniform float uLightRadiusNorm;
  uniform float uAspect;
  uniform float uAmbient;
  uniform vec2 uScreenSize;
  uniform float uTilePx;

  void main() {
    vec4 texColor = texture2D(uSampler, vTextureCoord);

    // 法线贴图
    vec2 screenPx = vTextureCoord * uScreenSize;
    vec2 tiledUV = screenPx / uTilePx;
    vec3 normal = texture2D(uNormalMap, tiledUV).rgb * 2.0 - 1.0;

    vec2 delta = vTextureCoord - uLightPosNorm;
    delta.x *= uAspect;
    float dist = length(delta);

    // ── 距离归一化（0=中心，1=视野边缘） ──
    float distNorm = dist / max(uLightRadiusNorm, 0.001);

    // 法线强度：中心最强，边缘消失
    float normalStr = 1.0 - smoothstep(0.15, 0.65, distNorm);
    vec3 blendedNormal = mix(vec3(0.0, 0.0, 1.0), normal, normalStr);

    // 纹理对比度：中心高对比，边缘向灰色淡化
    float contrastStr = 1.0 - smoothstep(0.10, 0.60, distNorm) * 0.92;
    float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    texColor.rgb = mix(vec3(gray), texColor.rgb, contrastStr);

    // ── 光照计算 ──
    vec2 lightDir2D = normalize(vec2(-delta.x, -delta.y));
    float NdotL = max(0.0, dot(blendedNormal, vec3(lightDir2D, 0.2)));
    float wrap = NdotL * 0.55 + 0.45;

    float t = smoothstep(uLightRadiusNorm * 0.3, uLightRadiusNorm, dist);
    float attenuation = 1.0 - t;

    float light = uAmbient + (1.0 - uAmbient) * wrap * attenuation;
    light = min(1.0, light);

    gl_FragColor = texColor * vec4(light, light, light, 1.0);
  }
`;

export class GroundLightingFilter extends PIXI.Filter {
  constructor(lightX, lightY, radius, screenW, screenH, normalTex, tileSize, tileScale) {
    super(null, fragSrc, {
      uLightPosNorm:   new Float32Array([lightX / screenW, lightY / screenH]),
      uLightRadiusNorm: radius / Math.max(1, screenH),
      uAspect:         screenW / Math.max(1, screenH),
      uAmbient:        0.03,
      uNormalMap:      normalTex,
      uScreenSize:     new Float32Array([screenW, screenH]),
      uTilePx:         tileSize / tileScale,
    });
    this.padding = 0;
    this._tileSize = tileSize;
    this._tileScale = tileScale;
  }

  update(lightX, lightY, radius, screenW, screenH) {
    this.uniforms.uLightPosNorm[0] = lightX / screenW;
    this.uniforms.uLightPosNorm[1] = lightY / screenH;
    this.uniforms.uLightRadiusNorm = radius / Math.max(1, screenH);
    this.uniforms.uAspect = screenW / Math.max(1, screenH);
    this.uniforms.uScreenSize[0] = screenW;
    this.uniforms.uScreenSize[1] = screenH;
    this.uniforms.uTilePx = this._tileSize / this._tileScale;
  }
}
