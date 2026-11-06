import { clamp, countAt, dailyCount } from './story-data.mjs';

// Time is an exclusive UTC-day boundary: selecting D settles at D + 1.
export function stateAtTime(series, time) {
  const day = Math.ceil(time) - 1;
  const count = countAt(series, day - 1) + dailyCount(series, day) * clamp(time - day, 0, 1);
  return { day, count };
}

// Share motion between calendar travel and cohort growth, including dense days.
export function transitionTime(series, from, to, progress) {
  if (progress >= 1 || from === to) return to;
  if (progress <= 0) return from;
  const weight = 1 - (1 - clamp(progress, 0, 1)) ** 3;
  const before = stateAtTime(series, from).count;
  const change = stateAtTime(series, to).count - before;
  if (!change) return from + (to - from) * weight;
  let low = 0, high = 1;
  for (let step = 0; step < 40; step++) {
    const fraction = (low + high) / 2;
    const count = stateAtTime(series, from + (to - from) * fraction).count;
    if ((fraction + (count - before) / change) / 2 < weight) low = fraction;
    else high = fraction;
  }
  return from + (to - from) * (low + high) / 2;
}
