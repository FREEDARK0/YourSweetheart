const fragSrc = `
  precision mediump float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform sampler2D uNormalMap;
  uniform vec2 uLightPos;
  uniform float uLightRadius;
  uniform vec2 uInputSize;
  uniform float uAmbient;

  void main() {
    vec4 texColor = texture2D(uSampler, vTextureCoord);
    vec3 normal = texture2D(uNormalMap, vTextureCoord).rgb * 2.0 - 1.0;

    vec2 pixelCoord = vTextureCoord * uInputSize;
    vec2 lightDir = uLightPos - pixelCoord;
    float dist = length(lightDir);
    lightDir = normalize(lightDir);

    float NdotL = max(0.0, dot(normal, vec3(lightDir, 0.0)));
    float wrap = NdotL * 0.6 + 0.4; // wrap lighting so shadows aren't pure black

    float t = smoothstep(uLightRadius, uLightRadius * 0.3, dist);
    float attenuation = 1.0 - t;

    float light = uAmbient + (1.0 - uAmbient) * wrap * attenuation;
    light = min(1.0, light);

    gl_FragColor = texColor * vec4(light, light, light, 1.0);
  }
`;

export class GroundLightingFilter extends PIXI.Filter {
  constructor(lightX, lightY, radius, screenW, screenH, normalTex) {
    super(null, fragSrc, {
      uLightPos:   new Float32Array([lightX, lightY]),
      uLightRadius: radius,
      uInputSize:  new Float32Array([screenW, screenH]),
      uAmbient:    0.06,
      uNormalMap:  normalTex,
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
