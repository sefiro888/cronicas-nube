/** Mar abierto: oleaje de dos direcciones, reflejo roto y crestas contenidas.
 * El Rompiente necesita mar abierto, no otro estanque inmóvil. */
export const seaFragmentShader = /* glsl */`
  uniform sampler2D uRipples;
  uniform sampler2D uReflection;
  uniform vec3 uColor;
  uniform vec3 uLightColor;
  uniform vec3 uLightDirection;
  uniform float uHasReflection;
  uniform float uTime;
  uniform float uRadius;
  varying vec3 vWorld;
  varying vec4 vReflection;
  #include <fog_pars_fragment>
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec2 p = vWorld.xz;
    float warp = noise(p * 0.31 + vec2(uTime * 0.006, 0.0)) * 3.8;
    float a = dot(p, vec2(0.32, 0.54)) - uTime * 0.65 + warp * 0.42;
    float b = dot(p, vec2(0.73, -0.21)) - uTime * 0.86 + warp;
    float c = dot(p, vec2(3.7, 2.2)) + uTime * 1.4 + noise(p * 0.93) * 4.3;
    float d = dot(p, vec2(8.3, -6.7)) - uTime * 1.7 + noise(p * 2.3) * 6.1;
    vec2 slope = vec2(0.32, 0.54) * cos(a) * 0.2 + vec2(0.73, -0.21) * cos(b) * 0.12
      + vec2(3.7, 2.2) * cos(c) * 0.036 + vec2(8.3, -6.7) * cos(d) * 0.011;
    vec2 fine = texture2D(uRipples, p * 0.19 + vec2(uTime * 0.006, -uTime * 0.008)).rg - 0.5;
    slope += fine * 0.4;
    vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
    vec3 view = normalize(cameraPosition - vWorld);
    float fresnel = 0.18 + 0.7 * pow(1.0 - max(dot(view, normal), 0.0), 3.0);
    float trough = 0.72 + sin(a) * 0.15 + sin(b) * 0.08 + sin(c) * 0.035;
    vec3 color = uColor * trough;
    float sky = pow(max(dot(normal, normalize(vec3(-0.4, 0.8, 0.3))), 0.0), 9.0);
    color += vec3(0.016, 0.022, 0.026) * sky;
    if (uHasReflection > 0.5 && vReflection.w > 0.0) {
      vec2 uv = vReflection.xy / vReflection.w + slope * 0.018;
      vec3 reflected = texture2D(uReflection, clamp(uv, 0.001, 0.999)).rgb * 0.5;
      reflected += texture2D(uReflection, clamp(uv + vec2(0.0015, -0.001), 0.001, 0.999)).rgb * 0.25;
      reflected += texture2D(uReflection, clamp(uv + vec2(-0.0015, 0.001), 0.001, 0.999)).rgb * 0.25;
      color = mix(color, reflected, fresnel);
    }
    vec3 sun = normalize(uLightDirection);
    float glint = pow(max(dot(reflect(-sun, normal), view), 0.0), 95.0);
    color += uLightColor * glint * 0.28;
    float crest = smoothstep(0.92, 1.0, sin(a + fine.x * 0.8))
      * smoothstep(0.63, 0.85, noise(p * 4.5 + uTime * vec2(0.03, -0.05)))
      * smoothstep(0.3, 0.72, noise(p * 26.0 + vec2(uTime * 0.06, 0.0)));
    color += vec3(0.11, 0.14, 0.14) * crest;
    float alpha = 1.0 - smoothstep(uRadius * 0.75, uRadius, length(p));
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

export const seaVertexShader = /* glsl */`
  uniform float uTime;
  uniform mat4 uReflectionMatrix;
  varying vec3 vWorld;
  varying vec4 vReflection;
  #include <fog_pars_vertex>
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec2 p = world.xz;
    world.y += sin(dot(p, vec2(0.32, 0.54)) - uTime * 0.65) * 0.045
      + sin(dot(p, vec2(0.73, -0.21)) - uTime * 0.86) * 0.018;
    vWorld = world.xyz;
    vReflection = uReflectionMatrix * world;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`
