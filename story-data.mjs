export const DAY = 86_400_000;
export const dayNumber = value => Math.floor(Date.parse(`${value}T00:00:00Z`) / DAY);
export const isoDay = day => new Date(day * DAY).toISOString().slice(0, 10);
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function makeSeries(candidate) {
  const start = dayNumber(candidate.firstDay);
  const end = dayNumber(candidate.lastDay);
  const counts = new Uint32Array(end - start + 1);
  for (const [date, count] of candidate.daily) counts[dayNumber(date) - start] = count;
  const cumulative = new Uint32Array(counts.length);
  let total = 0;
  counts.forEach((count, index) => { total += count; cumulative[index] = total; });
  if (total !== candidate.total) throw new Error('Daily counts do not match the source total.');
  return { ...candidate, start, end, counts, cumulative };
}

export function countAt(series, day) {
  if (day < series.start) return 0;
  return series.cumulative[Math.min(Math.floor(day) - series.start, series.counts.length - 1)];
}

export function dailyCount(series, day) {
  return series.counts[Math.floor(day) - series.start] || 0;
}

export function dayAtProgress(stops, progress) {
  const position = clamp(progress, 0, stops.length);
  const index = Math.min(Math.floor(position), stops.length - 1);
  const [start, end, focus] = stops[index];
  const fraction = position - index;
  const day = focus === undefined ? start + (end - start) * fraction
    : fraction <= 0.8 ? start + (focus - start) * fraction / 0.8
      : focus + (end - focus) * (fraction - 0.8) / 0.2;
  return Math.floor(day + 1e-7);
}

export function progressAtDay(stops, day) {
  for (let index = 0; index < stops.length; index++) {
    const [start, end, focus] = stops[index];
    if (day <= end && end > start) {
      const fraction = focus === undefined ? (day - start) / (end - start)
        : day <= focus ? (day - start) / (focus - start) * 0.8
          : 0.8 + (day - focus) / (end - focus) * 0.2;
      return index + clamp(fraction, 0, 1);
    }
  }
  return stops.length - 1;
}

// Only day indices enter the GPU. No account IDs are exported or loaded.
export function makePointDays(series) {
  const days = new Uint16Array(series.total);
  let offset = 0;
  series.counts.forEach((count, day) => {
    days.fill(day, offset, offset + count);
    offset += count;
  });
  return days;
}

export function viewWindow(series, day, zoom, storyStart, storyEnd = series.end) {
  const end = Math.max(series.end, storyEnd);
  if (zoom === 'day') return [day, day + 1];
  if (zoom === 'campaign') return [dayNumber('2023-01-01'), end + 1];
  if (zoom === 'year') {
    const start = clamp(day - 182, storyStart, Math.max(storyStart, end - 364));
    return [start, start + 365];
  }
  return [storyStart, end + 1];
}

export function makeTimeScale(start, end, day, mode) {
  let split = dayNumber('2023-01-01');
  const automatic = mode === 'story' && start < split && end > split;
  const focus = automatic ? clamp((day - split) / 30, 0, 1) : 0;
  const naturalShare = (split - start) / (end - start);
  let share = focus ? naturalShare + (0.22 - naturalShare) * focus : null;
  if (automatic && end > dayNumber('2023-03-01')) {
    const smooth = value => { const x = clamp(value, 0, 1); return x * x * (3 - 2 * x); };
    const march = dayNumber('2023-03-01'), campaign = smooth((day - march) / 7);
    if (campaign && campaign < 1) {
      split += (march - split) * campaign;
      share *= 1 - campaign;
    } else if (campaign === 1) {
      const ballots = smooth((day - dayNumber('2023-05-01')) / 7);
      start = march + (Math.min(dayNumber('2023-05-07'), end - 1) - march) * ballots;
      return { start, end, split, share: null, detail: ballots ? 'ballots' : 'campaign' };
    }
  }
  return { start, end, split, share };
}

export function timePosition(day, { start, end, split, share }) {
  if (share === null) return (day - start) / (end - start);
  return day < split ? (day - start) / (split - start) * share
    : share + (day - split) / (end - split) * (1 - share);
}

export function timeDay(position, { start, end, split, share }) {
  if (share === null) return start + position * (end - start);
  return position < share ? start + position / share * (split - start)
    : split + (position - share) / (1 - share) * (end - split);
}
