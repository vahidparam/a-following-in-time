import { DAY, dayNumber, clamp } from './story-data.mjs';

export function decodePairs(buffer, metadata) {
  if (buffer.byteLength !== metadata.total * 8) throw new Error('Paired coordinates do not match the shared-user count.');
  return { buffer, days: new Uint16Array(buffer), gaps: new Int32Array(buffer), total: metadata.total };
}

export function pairAt(data, index) {
  if (index < 0 || index >= data.total) return null;
  return { kk: data.days[index * 4], rte: data.days[index * 4 + 1], gap: data.gaps[index * 2 + 1], index };
}

export const pairOrder = gap => gap > 0 ? 1 : gap < 0 ? 2 : 3;

export function calendarPosition(day, span, split, focus = 0) {
  if (!focus || split <= 0 || split >= span) return day / span;
  const share = split / span + (0.22 - split / span) * focus;
  return day < split ? day / split * share : share + (day - split) / (span - split) * (1 - share);
}

export function pairPosition(pair, span, fold, focus = 0, split = 0) {
  const first = Math.min(pair.kk, pair.rte);
  const gap = Math.sign(pair.gap) * Math.log1p(Math.abs(pair.gap)) / Math.log1p(span * 86400);
  return [(1 - fold) * calendarPosition(pair.kk, span, split, focus) + fold * calendarPosition(first, span, split, focus), (1 - fold) * calendarPosition(pair.rte, span, split, focus) + fold * (0.5 + gap * 0.45)];
}

export function pairDate(offset, epoch) {
  return new Date((dayNumber(epoch) + offset) * DAY).toISOString().slice(0, 10);
}

export function gapLabel(seconds) {
  const value = Math.abs(seconds);
  if (!value) return 'Equal estimated timestamps';
  if (value < 60) return 'Less than a minute';
  if (value < 3600) return `About ${Math.round(value / 60)} minutes`;
  if (value < 86400) return `About ${(value / 3600).toFixed(1)} hours`;
  if (value < 365 * 86400) return `About ${Math.round(value / 86400)} days`;
  return `About ${(value / (365.25 * 86400)).toFixed(1)} years`;
}

export function selectedTotals(metadata, different, campaign) {
  const source = campaign ? metadata.campaign : metadata;
  const order = different ? { ...source.dayOrder, equal: 0 } : source.timestampOrder;
  return { ...order, total: order.kkFirst + order.rteFirst + order.equal };
}

// Each grid cell keeps a real anonymous example, plus an exact regional count.
export function spatialIndex(data, span, fold, options = {}, resolution = 128) {
  const counts = new Uint32Array(resolution * resolution);
  const examples = new Int32Array(counts.length).fill(-1);
  const maxLog = Math.log1p(span * 86400);
  for (let i = 0; i < data.total; i++) {
    const kk = data.days[i * 4], rte = data.days[i * 4 + 1], gap = data.gaps[i * 2 + 1];
    if (options.different && kk === rte || options.campaign && Math.max(kk, rte) < options.split) continue;
    if (options.event >= 0 && Math.max(kk, rte) !== options.event) continue;
    if (options.order && (options.order === 4 ? kk !== rte : pairOrder(gap) !== options.order)) continue;
    const x = calendarPosition(fold ? Math.min(kk, rte) : kk, span, options.split, options.focus);
    const y = fold ? 0.5 + Math.sign(gap) * Math.log1p(Math.abs(gap)) / maxLog * 0.45 : calendarPosition(rte, span, options.split, options.focus);
    const cell = clamp(Math.floor(y * resolution), 0, resolution - 1) * resolution + clamp(Math.floor(x * resolution), 0, resolution - 1);
    counts[cell]++;
    if (examples[cell] < 0) examples[cell] = i;
  }
  return { counts, examples, resolution };
}

export function nearbyPair(grid, x, y) {
  const column = Math.floor(x * grid.resolution), row = Math.floor(y * grid.resolution);
  let closest = null, distance = Infinity;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const px = column + dx, py = row + dy;
    if (px < 0 || px >= grid.resolution || py < 0 || py >= grid.resolution) continue;
    const cell = py * grid.resolution + px;
    const value = (px + 0.5 - x * grid.resolution) ** 2 + (py + 0.5 - y * grid.resolution) ** 2;
    if (grid.counts[cell] && value < distance) {
      closest = { index: grid.examples[cell], count: grid.counts[cell] };
      distance = value;
    }
  }
  return closest;
}
