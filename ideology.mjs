export const IDEOLOGY_ZERO = 0.46;
export const IDEOLOGY_SPAN = 0.41;
export const MISSING_Y = 0.97;
export const IDEOLOGY_BINS = 64;
export const DENSITY_ROWS = IDEOLOGY_BINS + 2;
export const IDEOLOGY_LIMIT = 1.5;

export const ideologyPosition = score => Number.isFinite(score)
  ? IDEOLOGY_ZERO - Math.max(-IDEOLOGY_LIMIT, Math.min(IDEOLOGY_LIMIT, score)) / IDEOLOGY_LIMIT * IDEOLOGY_SPAN : MISSING_Y;

export function ideologyAtPosition(position) {
  if (position < 0.05 || position > 0.87) return null;
  return (IDEOLOGY_ZERO - position) / IDEOLOGY_SPAN * IDEOLOGY_LIMIT;
}

export function decodeIdeology(buffer, total) {
  if (buffer.byteLength !== total * 4) throw new Error('Ideology coordinates do not match the follower count.');
  return new Float32Array(buffer);
}

// Within-day follow order is unknown; reveal a stable mix of scores, not a sorted sweep.
export function mixWithinDays(scores, counts) {
  let offset = 0;
  counts.forEach((count, day) => {
    let seed = Math.imul(day + 1, 2654435761) >>> 0;
    for (let index = count - 1; index > 0; index--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const other = offset + seed % (index + 1);
      const point = offset + index;
      const value = scores[point];
      scores[point] = scores[other];
      scores[other] = value;
    }
    offset += count;
  });
  return scores;
}

export function loadIdeology(series, progress) {
  series.scoreProgress = progress;
  if (!series.scorePromise) series.scorePromise = (async () => {
    const buffer = await loadCompressed(new URL(`./data/${series.ideology.file}`, import.meta.url), series.ideology.compressedBytes, (...args) => series.scoreProgress?.(...args));
    series.scores = mixWithinDays(decodeIdeology(buffer, series.total), series.counts);
    return series.scores;
  })().catch(error => { delete series.scorePromise; throw error; });
  return series.scorePromise;
}

export function crossIndices(series, { start, end, sign }) {
  const indices = [];
  for (let point = countAt(series, start - 1); point < countAt(series, end - 1); point++) {
    if (series.scores[point] * sign > 0) indices.push(point);
  }
  return new Uint32Array(indices);
}

export function lowerBound(values, value) {
  let low = 0, high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (values[middle] < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function makeIdeologyDensity(series) {
  const density = new Uint32Array(series.counts.length * DENSITY_ROWS);
  const extent = IDEOLOGY_LIMIT;
  let point = 0;
  series.counts.forEach((count, day) => {
    for (let index = 0; index < count; index++) {
      const score = series.scores[point++];
      const bin = !Number.isFinite(score) ? IDEOLOGY_BINS + 1 : score === 0 ? IDEOLOGY_BINS
        : Math.max(0, Math.min(IDEOLOGY_BINS - 1, Math.floor((score / extent + 1) / 2 * IDEOLOGY_BINS)));
      density[day * DENSITY_ROWS + bin]++;
    }
  });
  return density;
}
import { countAt } from './story-data.mjs';
import { loadCompressed } from './story-loading.mjs';

