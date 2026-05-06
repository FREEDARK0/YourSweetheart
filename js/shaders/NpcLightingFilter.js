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

    // 当前像素的世界坐标
    vec2 localPx = (vTextureCoord - uAnchor) * uSpriteWorldSize;
    vec2 worldPx = uNpcWorldPos + localPx;

    // 到光源的距离
    float dist = length(worldPx - uLightPos);

    // 聚光半径：光源形状投射到 NPC 身上的亮斑大小
    float spotR = uLightRadius * 0.55;

    // 窄过渡带形成可见的明暗交接线
    float t = smoothstep(spotR * 0.45, spotR, dist);

    // 亮斑区域提亮，外部压暗
    float light = mix(1.35, 0.04, t);
    light = clamp(light, 0.0, 1.0);

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
    this.padding = 0;
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
