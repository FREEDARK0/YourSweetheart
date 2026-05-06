const fragSrc = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform vec2 uNpcWorldPos;     // NPC 世界坐标（屏幕像素）
  uniform vec2 uSpriteWorldSize; // 精灵在世界空间的宽高（像素）
  uniform vec2 uAnchor;          // 精灵锚点 (0.5, 0.85)
  uniform vec2 uLightPos;        // 光源世界坐标（屏幕像素）
  uniform float uLightRadius;    // 光源有效照明半径

  void main() {
    vec4 texColor = texture2D(uSampler, vTextureCoord);

    // 将纹理 UV 转换为世界像素坐标
    vec2 localPx = (vTextureCoord - uAnchor) * uSpriteWorldSize;
    vec2 worldPx = uNpcWorldPos + localPx;

    float dist = length(worldPx - uLightPos);
    float t = smoothstep(0.0, uLightRadius, dist);
    float light = 1.0 - t * 0.65;

    gl_FragColor = texColor * vec4(light, light, light, 1.0);
  }
`;

export class NpcLightingFilter extends PIXI.Filter {
  constructor(npcX, npcY, spriteW, spriteH, anchorX, anchorY, lightX, lightY, lightRadius) {
    super(null, fragSrc, {
      uNpcWorldPos:     new Float32Array([npcX, npcY]),
      uSpriteWorldSize: new Float32Array([spriteW, spriteH]),
      uAnchor:          new Float32Array([anchorX, anchorY]),
      uLightPos:        new Float32Array([lightX, lightY]),
      uLightRadius:     lightRadius,
    });
  }

  update(npcX, npcY, spriteW, spriteH, lightX, lightY, lightRadius) {
    this.uniforms.uNpcWorldPos[0] = npcX;
    this.uniforms.uNpcWorldPos[1] = npcY;
    this.uniforms.uSpriteWorldSize[0] = spriteW;
    this.uniforms.uSpriteWorldSize[1] = spriteH;
    this.uniforms.uLightPos[0] = lightX;
    this.uniforms.uLightPos[1] = lightY;
    this.uniforms.uLightRadius = lightRadius;
  }
}
