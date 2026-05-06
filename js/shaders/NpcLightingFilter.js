const fragSrc = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform vec2 uNpcWorldPos;
  uniform vec2 uSpriteWorldSize;
  uniform vec2 uAnchor;
  uniform vec2 uLightPos;
  uniform float uLightRadius;

  void main() {
    vec4 texColor = texture2D(uSampler, vTextureCoord);

    // 当前像素相对于 NPC 中心的世界坐标偏移
    vec2 localPx = (vTextureCoord - uAnchor) * uSpriteWorldSize;
    vec2 worldPx = uNpcWorldPos + localPx;

    // 光源到 NPC 中心的方向（决定哪一侧亮）
    vec2 toLight = uLightPos - uNpcWorldPos;
    float distToNpc = length(toLight);
    vec2 lightDir = distToNpc > 0.5 ? toLight / distToNpc : vec2(1.0, 0.0);

    // 当前像素的局部方向（归一化到精灵宽度）
    vec2 pixDir = localPx / (uSpriteWorldSize * 0.5);

    // 面向光源的程度：1.0=正对光源，-1.0=背对光源
    float facing = dot(normalize(pixDir), lightDir);

    // 方向光：迎光面亮，背光面暗
    float dirLight = 0.08 + (facing * 0.5 + 0.5) * 0.92;

    // 距离衰减：离光源越远整体越暗
    float distAtten = 1.0 - smoothstep(uLightRadius * 0.3, uLightRadius, distToNpc) * 0.75;

    float light = dirLight * distAtten;
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
