import { countAt, dailyCount, makePointDays, timePosition } from './story-data.mjs';
import { DENSITY_ROWS, IDEOLOGY_BINS, IDEOLOGY_LIMIT, crossIndices, lowerBound, ideologyPosition, makeIdeologyDensity } from './ideology.mjs';

const vertexSource = `#version 300 es
precision highp float;
layout(location=0) in uint aDay;
layout(location=1) in float aIdeology0;
uniform float uStart, uSpan, uPointSize, uSplit, uShare, uIdeologyExtent;
uniform float uFocusStart, uFocusEnd, uCrossSign, uFocusMix;
out float vLight;
out float vFocus;
uint hash(uint x) {
  x ^= x >> 16; x *= 0x7feb352du;
  x ^= x >> 15; x *= 0x846ca68bu;
  return x ^ (x >> 16);
}
float random(uint x) { return float(hash(x)) / 4294967295.0; }
void main() {
  uint id = uint(gl_VertexID);
  float day = float(aDay) + random(id);
  float x = (day - uStart) / uSpan;
  if (uShare >= 0.0) {
    x = day < uSplit ? (day - uStart) / (uSplit - uStart) * uShare
      : uShare + (day - uSplit) / (uStart + uSpan - uSplit) * (1.0 - uShare);
  }
  float y = isnan(aIdeology0) ? -0.94 + (random(id + 7919u) - 0.5) * 0.025
    : 0.08 + clamp(aIdeology0, -uIdeologyExtent, uIdeologyExtent) / uIdeologyExtent * 0.82;
  gl_Position = vec4(x * 2.0 - 1.0, y, 0, 1);
  gl_PointSize = uPointSize;
  vLight = 0.55 + random(id + 31u) * 0.45;
  bool selected = float(aDay) >= uFocusStart && float(aDay) < uFocusEnd && aIdeology0 * uCrossSign > 0.0;
  vFocus = selected ? uFocusMix : 0.0;
  vLight *= mix(1.0, selected ? 1.0 : 0.5, uFocusMix);
  if (uShare >= 0.0 && day < uSplit) vLight *= uShare / ((uSplit - uStart) / uSpan);
}`;

const fragmentSource = `#version 300 es
precision highp float;
uniform float uAlpha;
in float vLight;
in float vFocus;
out vec4 color;
void main() {
  if (length(gl_PointCoord - 0.5) > 0.5) discard;
  color = vec4(1, 1, 1, min(1.0, uAlpha * vLight * mix(1.0, 5.0, vFocus)));
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

export class DotField {
  constructor(canvas, status) {
    this.canvas = canvas;
    this.status = status;
    try {
      this.gl = canvas.getContext('webgl2', { antialias: false, alpha: true });
      if (!this.gl) throw new Error('WebGL2 unavailable');
      this.init();
    } catch {
      this.gl = null;
      this.canvas = canvas.cloneNode();
      canvas.replaceWith(this.canvas);
      this.context = this.canvas.getContext('2d');
      status.textContent = 'Ideology density view · brighter areas contain more recorded relationships.';
    }
    this.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.lost = true;
      status.textContent = 'Graphics paused by the browser. Restoring the dot view…';
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.init();
      this.lost = false;
      if (this.series) this.setSeries(this.series);
      status.textContent = '';
      window.dispatchEvent(new Event('resize'));
    });
  }

  init() {
    const gl = this.gl;
    this.program = gl.createProgram();
    const shaders = [compile(gl, gl.VERTEX_SHADER, vertexSource), compile(gl, gl.FRAGMENT_SHADER, fragmentSource)];
    shaders.forEach(shader => gl.attachShader(this.program, shader));
    gl.linkProgram(this.program);
    shaders.forEach(shader => gl.deleteShader(shader));
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error('Could not link dot renderer');
    gl.useProgram(this.program);
    this.uniforms = Object.fromEntries(['uStart', 'uSpan', 'uPointSize', 'uAlpha', 'uSplit', 'uShare', 'uIdeologyExtent', 'uFocusStart', 'uFocusEnd', 'uCrossSign', 'uFocusMix'].map(name => [name, gl.getUniformLocation(this.program, name)]));
    this.buffer = gl.createBuffer();
    this.scoreBuffer = gl.createBuffer();
    this.focusBuffer = gl.createBuffer();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  setSeries(series) {
    this.series = series;
    this.focusKey = null;
    if (this.lost) return;
    if (!this.gl) {
      series.ideologyDensity ||= makeIdeologyDensity(series);
      return;
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, makePointDays(series), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribIPointer(0, 1, gl.UNSIGNED_SHORT, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.scoreBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, series.scores, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
  }

  clear() {
    if (this.gl) this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    else this.context?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(day, scale, revealed = countAt(this.series, day), focus = null) {
    if (this.lost) return;
    const { start, end, split, share } = scale;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(this.canvas.clientWidth * ratio);
    const height = Math.round(this.canvas.clientHeight * ratio);
    if (!width || !height) return;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    if (!this.gl) return this.drawDensity(day, scale, width, height, revealed, focus);
    const gl = this.gl;
    const first = countAt(this.series, start - 1);
    const last = Math.min(revealed, countAt(this.series, Math.min(day, end - 1)));
    const visible = Math.max(0, last - first);
    let selected;
    if (focus) {
      const key = `${focus.start}-${focus.end}-${focus.sign}`;
      if (this.focusKey !== key) {
        this.focusKey = key;
        this.focusPoints = crossIndices(this.series, focus);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.focusBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.focusPoints, gl.STATIC_DRAW);
      }
      selected = this.focusPoints;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.focusBuffer);
    }
    const draw = (from, to) => selected
      ? gl.drawElements(gl.POINTS, Math.max(0, lowerBound(selected, to) - lowerBound(selected, from)), gl.UNSIGNED_INT, lowerBound(selected, from) * 4)
      : gl.drawArrays(gl.POINTS, from, Math.max(0, to - from));
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(this.uniforms.uStart, start - this.series.start);
    gl.uniform1f(this.uniforms.uSpan, end - start);
    gl.uniform1f(this.uniforms.uSplit, split - this.series.start);
    gl.uniform1f(this.uniforms.uShare, share ?? -1);
    gl.uniform1f(this.uniforms.uIdeologyExtent, IDEOLOGY_LIMIT);
    gl.uniform1f(this.uniforms.uFocusStart, (focus?.start ?? this.series.start) - this.series.start);
    gl.uniform1f(this.uniforms.uFocusEnd, (focus?.end ?? this.series.start) - this.series.start);
    gl.uniform1f(this.uniforms.uCrossSign, focus?.sign ?? 0);
    gl.uniform1f(this.uniforms.uFocusMix, focus?.mix ?? 0);
    gl.uniform1f(this.uniforms.uPointSize, ratio * 1.3);
    const population = selected ? lowerBound(selected, last) - lowerBound(selected, first) : visible;
    gl.uniform1f(this.uniforms.uAlpha, Math.min(0.95, Math.max(0.008, width * height / (population * ratio * ratio) * 0.35)));
    draw(first, last);
    // The current day's points are brighter; the previous days remain in place.
    if (day >= start && day < end) {
      gl.uniform1f(this.uniforms.uAlpha, 0.7);
      const earlier = countAt(this.series, day - 1);
      draw(earlier, Math.max(earlier, Math.min(countAt(this.series, day), revealed)));
    }
  }

  drawDensity(day, scale, width, height, revealed, focus) {
    const context = this.context;
    if (!context) return;
    const { start, end } = scale;
    context.clearRect(0, 0, width, height);
    const extent = IDEOLOGY_LIMIT;
    context.fillStyle = '#ffffff';
    for (let date = Math.max(Math.floor(start), this.series.start); date <= Math.min(day, end - 1, this.series.end); date++) {
      const x = timePosition(date, scale) * width;
      const barWidth = timePosition(date + 1, scale) * width - x;
      for (let bin = 0; bin < DENSITY_ROWS; bin++) {
        const fraction = date === day && dailyCount(this.series, day) ? (revealed - countAt(this.series, day - 1)) / dailyCount(this.series, day) : 1;
        const count = this.series.ideologyDensity[(date - this.series.start) * DENSITY_ROWS + bin] * fraction;
        if (!count) continue;
        const score = bin === IDEOLOGY_BINS ? 0 : bin > IDEOLOGY_BINS ? NaN : ((bin + 0.5) / IDEOLOGY_BINS * 2 - 1) * extent;
        if (focus && !(date >= focus.start && date < focus.end && score * focus.sign > 0)) continue;
        const cellHeight = bin < IDEOLOGY_BINS ? height * 0.82 / IDEOLOGY_BINS : Math.max(1, height * 0.015);
        context.globalAlpha = Math.min(0.9, Math.log1p(count) / 10);
        context.fillRect(x, ideologyPosition(score) * height - cellHeight / 2, Math.max(1, barWidth), cellHeight);
      }
    }
    context.globalAlpha = 1;
  }
}
