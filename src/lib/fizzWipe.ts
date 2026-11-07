// Route-change transition: a can being poured. Liquid rises with bubbles racing ahead of it, keeps fizzing while the
// next page loads, then drains away. Plain WebGL2 and one quad, compiled at startup, redrawn every frame while visible.
//   uIn  0 > 1: pour (liquid and bubbles cover the screen)
//   uOut 0 > 1: drain (liquid level falls off the bottom, last bubbles float up and shrink)

const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
#define MAX_BUBBLES 42
uniform vec2 uRes; uniform float uIn, uOut, uTime; uniform vec3 uColor; uniform int uCount;
out vec4 o;
float h(float n){ return fract(sin(n * 127.1) * 43758.5453); }
// Smooth union: bubbles touching the surface merge into it like foam instead of overlapping as hard circles.
float smin(float a, float b, float k){ float t = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, t) - k * t * (1.0 - t); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);

  // Liquid surface: rises with the pour, falls with the drain, with a slow slosh.
  float level = mix(-0.3, 1.3, smoothstep(0.1, 1.0, uIn)) - smoothstep(0.0, 1.0, uOut) * 1.65;
  level += 0.022 * sin(p.x * 7.0 + uTime * 2.6) + 0.012 * sin(p.x * 17.0 - uTime * 3.4);
  float field = p.y - level;

  float ring = 0.0, spec = 0.0;
  float present = smoothstep(0.0, 0.2, uIn) * (1.0 - smoothstep(0.55, 1.0, uOut));
  for (int i = 0; i < MAX_BUBBLES; i++){
    if (i >= uCount) break; // Fewer bubbles on weak GPUs: every bubble costs work on every pixel.
    float f = float(i);
    float size = 0.022 + pow(h(f * 7.13), 2.0) * 0.09;
    float speed = 0.16 + h(f * 3.71) * 0.3 + size * 1.4;          // big bubbles rise faster, like real fizz
    float y = fract(h(f * 9.27) + uTime * speed * 0.42) * 1.7 - 0.35;
    float x = h(f * 1.31) * asp + sin(uTime * (1.2 + h(f * 5.5)) + f) * 0.012;
    vec2 c = vec2(x, y);
    float r = size * present * (0.9 + 0.1 * sin(uTime * 6.0 + f));
    // Above the surface only while pouring: they lead the liquid up, and float off as it drains.
    float above = step(level, y);
    r *= mix(1.0, smoothstep(0.0, 0.55, uIn) * (1.0 - smoothstep(0.2, 0.9, uOut)), above);
    float d = length(p - c) - r;
    field = smin(field, d, 0.05);
    // Bubbles inside the drink: bright rim plus a highlight, so they read as bubbles, not spots.
    float inside = 1.0 - above;
    ring = max(ring, smoothstep(0.0045, 0.0, abs(d)) * inside * step(0.004, r));
    spec = max(spec, smoothstep(r * 0.24, r * 0.1, length(p - c - vec2(-0.35, 0.38) * r)) * step(0.004, r));
  }

  float cover = smoothstep(0.004, -0.004, field);
  vec3 col = uColor * (0.7 + 0.42 * uv.y);
  col += vec3(1.0) * smoothstep(0.03, 0.0, abs(field)) * 0.5;      // foam line on the surface and outer bubbles
  col += vec3(1.0) * ring * 0.45 + vec3(1.0) * spec * 0.85;
  float alpha = clamp(cover + spec * (1.0 - cover) * 0.9, 0.0, 1.0);
  o = vec4(min(col, vec3(1.0)) * alpha, alpha);                     // premultiplied
}`;

export type FizzWipe = { draw: (state: { in: number; out: number; color: [number, number, number] }) => void; resize: () => void };

export function createFizzWipe(canvas: HTMLCanvasElement, maxDpr: number, bubbles: number): FizzWipe | null {
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(prog, name);
  const U = { res: u("uRes"), in: u("uIn"), out: u("uOut"), time: u("uTime"), color: u("uColor") };
  gl.uniform1i(u("uCount"), Math.min(42, bubbles));
  const t0 = performance.now();

  const resize = () => {
    // Capped resolution: the liquid is soft-edged, so full retina pixels buy nothing but GPU time.
    const dpr = Math.min(devicePixelRatio, maxDpr);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.res, canvas.width, canvas.height);
  };
  resize();

  const draw: FizzWipe["draw"] = (s) => {
    gl.uniform1f(U.in, s.in);
    gl.uniform1f(U.out, s.out);
    gl.uniform1f(U.time, (performance.now() - t0) / 1000);
    gl.uniform3f(U.color, ...s.color);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  // Draw once now, invisible, so the driver finishes compiling before the first real navigation.
  draw({ in: 0, out: 0, color: [0, 0, 0] });
  return { resize, draw };
}
