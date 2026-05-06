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
  uniform float uTilePx;  // TILE_SIZE / tileScale = effective tile size in screen pixels

  void main() {
    vec4 texColor = texture2D(uSampler, vTextureCoord);

    // 重建 TilingSprite 的平铺 UV，使法线贴图与纹理逐格对齐
    vec2 screenPx = vTextureCoord * uScreenSize;
    vec2 tiledUV = screenPx / uTilePx;
    vec3 normal = texture2D(uNormalMap, tiledUV).rgb * 2.0 - 1.0;

    vec2 delta = vTextureCoord - uLightPosNorm;
    delta.x *= uAspect;
    float dist = length(delta);

    vec2 lightDir2D = normalize(vec2(-delta.x, -delta.y));
    float NdotL = max(0.0, dot(normal, vec3(lightDir2D, 0.2)));
    float wrap = NdotL * 0.55 + 0.45;

    float t = smoothstep(uLightRadiusNorm * 0.3, uLightRadiusNorm, dist);
    float attenuation = 1.0 - t;

    float light = uAmbient + (1.0 - uAmbient) * wrap * attenuation;
    light = min(1.0, light);

    gl_FragColor = texColor * vec4(light, light, light, 1.0);
  }
`;

export class GroundLightingFilter extends PIXI.Filter {
  /**
   * @param {number} tileSize - 纹理原始尺寸（px）
   * @param {number} tileScale - TilingSprite.tileScale 值
   */
  constructor(lightX, lightY, radius, screenW, screenH, normalTex, tileSize, tileScale) {
    const minDim = Math.min(screenW, screenH);
    super(null, fragSrc, {
      uLightPosNorm:   new Float32Array([lightX / screenW, lightY / screenH]),
      uLightRadiusNorm: radius / minDim,
      uAspect:         screenW / Math.max(1, screenH),
      uAmbient:        0.03,
      uNormalMap:      normalTex,
      uScreenSize:     new Float32Array([screenW, screenH]),
      uTilePx:         tileSize / tileScale,
    });
    this._tileSize = tileSize;
    this._tileScale = tileScale;
  }

  update(lightX, lightY, radius, screenW, screenH) {
    const minDim = Math.min(screenW, screenH);
    this.uniforms.uLightPosNorm[0] = lightX / screenW;
    this.uniforms.uLightPosNorm[1] = lightY / screenH;
    this.uniforms.uLightRadiusNorm = radius / minDim;
    this.uniforms.uAspect = screenW / Math.max(1, screenH);
    this.uniforms.uScreenSize[0] = screenW;
    this.uniforms.uScreenSize[1] = screenH;
    this.uniforms.uTilePx = this._tileSize / this._tileScale;
  }
}
