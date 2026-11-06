import { dayNumber } from './story-data.mjs';
import { nearbyPair, pairAt, pairPosition, spatialIndex } from './both-data.mjs';

const vertex = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in uvec2 aDays;
layout(location=1) in int aGap;
uniform float uSpan, uFold, uSize, uOrder, uDifferent, uCampaign, uSplit, uFocus, uEvent;
out float vLight;
float calendar(float day){
  float focus=uSplit>0.0&&uSplit<uSpan?uFocus:0.0;
  float share=mix(uSplit/uSpan,0.22,focus);
  return day<uSplit?day/uSplit*share:share+(day-uSplit)/(uSpan-uSplit)*(1.0-share);
}
void main(){
  vec2 dates=vec2(calendar(float(aDays.x)),calendar(float(aDays.y)));
  float signGap=sign(float(aGap));
  float wait=0.5+signGap*log(1.0+abs(float(aGap)))/log(1.0+uSpan*86400.0)*0.45;
  vec2 unfolded=vec2(min(dates.x,dates.y),wait);
  gl_Position=vec4(mix(dates,unfolded,uFold)*2.0-1.0,0,1);
  gl_PointSize=uSize;
  float group=aGap>0?1.0:aGap<0?2.0:3.0;
  bool selected=uOrder<0.5||(uOrder==4.0?aDays.x==aDays.y:group==uOrder);
  selected=selected&&(uEvent<0.0||float(max(aDays.x,aDays.y))==uEvent);
  vLight=selected?1.0:0.45;
  if((uDifferent>0.5&&aDays.x==aDays.y)||(uCampaign>0.5&&float(max(aDays.x,aDays.y))<uSplit))gl_Position=vec4(3,3,0,1);
}`;
const fragment = `#version 300 es
precision highp float;
uniform float uAlpha;
in float vLight;
out vec4 color;
void main(){if(length(gl_PointCoord-0.5)>0.5)discard;color=vec4(1,1,1,uAlpha*vLight);}`;

function shader(gl, type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
  return result;
}

export class BothField {
  constructor(canvas, metadata, status) {
    this.canvas = canvas;
    this.metadata = metadata;
    this.span = dayNumber(metadata.storyEnd || metadata.lastDay) - dayNumber(metadata.epoch) + 1;
    this.split = dayNumber('2023-01-01') - dayNumber(metadata.epoch);
    this.grids = new Map();
    try {
      this.gl = canvas.getContext('webgl2', { antialias: false, alpha: true });
      if (!this.gl) throw new Error('WebGL2 unavailable');
      this.init();
    } catch {
      this.gl = null;
      this.canvas = canvas.cloneNode();
      canvas.replaceWith(this.canvas);
      this.context = this.canvas.getContext('2d');
      status.textContent = 'Density view · brighter areas contain more shared accounts.';
    }
    this.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.lost = true; status.textContent = 'Restoring the shared audience…'; });
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.init(); this.lost = false; if (this.data) this.setData(this.data); status.textContent = ''; dispatchEvent(new Event('resize'));
    });
  }

  init() {
    const gl = this.gl;
    this.program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const compiled = shader(gl, type, source);
      gl.attachShader(this.program, compiled);
      gl.deleteShader(compiled);
    }
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program));
    gl.useProgram(this.program);
    this.uniforms = Object.fromEntries(['uSpan', 'uFold', 'uSize', 'uOrder', 'uDifferent', 'uCampaign', 'uSplit', 'uFocus', 'uEvent', 'uAlpha'].map(name => [name, gl.getUniformLocation(this.program, name)]));
    this.buffer = gl.createBuffer();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  setData(data) {
    this.data = data;
    if (!this.gl || this.lost) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.buffer, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribIPointer(0, 2, gl.UNSIGNED_SHORT, 8, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribIPointer(1, 1, gl.INT, 8, 4);
  }

  grid(fold, options) {
    const mode = fold >= 0.5 ? 1 : 0;
    const focus = options.focus >= 0.5 ? 1 : 0;
    const key = `${mode}-${focus}-${options.order}-${options.different}-${options.campaign}-${options.event}`;
    if (!this.grids.has(key)) this.grids.set(key, spatialIndex(this.data, this.span, mode, { ...options, focus, split: this.split }));
    return this.grids.get(key);
  }

  draw(reveal, fold, options) {
    if (!this.data || this.lost) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const width = Math.round(this.canvas.clientWidth * ratio), height = Math.round(this.canvas.clientHeight * ratio);
    if (!width || !height) return;
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const count = Math.floor(this.data.total * reveal);
    if (!this.gl) return this.drawDensity(count ? 1 : 0, fold, options, width, height);
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.viewport(0, 0, width, height); gl.clear(gl.COLOR_BUFFER_BIT);
    const population = options.different || options.campaign ? options.population ?? count : count;
    const values = { uSpan: this.span, uFold: fold, uSize: ratio * 1.25, uOrder: options.order, uDifferent: Number(options.different), uCampaign: Number(options.campaign), uSplit: this.split, uFocus: options.focus || 0, uEvent: options.event ?? -1, uAlpha: Math.min(0.95, Math.max(0.012, width * height / Math.max(1, population) * 0.12)) };
    for (const [name, value] of Object.entries(values)) gl.uniform1f(this.uniforms[name], value);
    gl.drawArrays(gl.POINTS, 0, count);
  }

  drawDensity(reveal, fold, options, width, height) {
    const context = this.context;
    if (!context) return;
    context.clearRect(0, 0, width, height);
    if (!reveal) return;
    const grid = this.grid(fold, options);
    context.fillStyle = '#fff';
    grid.counts.forEach((count, index) => {
      if (!count) return;
      context.globalAlpha = Math.min(0.95, Math.log1p(count) / 11);
      context.fillRect(index % grid.resolution / grid.resolution * width, (1 - (Math.floor(index / grid.resolution) + 1) / grid.resolution) * height, Math.ceil(width / grid.resolution), Math.ceil(height / grid.resolution));
    });
    context.globalAlpha = 1;
  }

  pick(x, y, fold, options) {
    const found = nearbyPair(this.grid(fold, options), x, y);
    if (!found) return null;
    const pair = pairAt(this.data, found.index);
    return { ...pair, count: found.count, position: pairPosition(pair, this.span, fold >= 0.5 ? 1 : 0, options.focus >= 0.5 ? 1 : 0, this.split) };
  }
}
