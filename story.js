import { DAY, clamp, countAt, dailyCount, dayAtProgress, dayNumber, isoDay, makeSeries, makeTimeScale, progressAtDay, timeDay, timePosition, viewWindow } from './story-data.mjs';
import { DotField } from './dot-field.js';
import { PoliticalContext } from './story-events.js';
import { IDEOLOGY_LIMIT, ideologyAtPosition, loadIdeology } from './ideology.mjs';
import { STORIES } from './stories.mjs';
import { mountNarrative } from './story-content.js';
import { stateAtTime, transitionTime } from './timeline-motion.mjs';
import { CrossIdeology } from './cross-ideology.js';

const $ = id => document.getElementById(id);
let chapters = [], stops = [], firstDay, lastDay, plotStart, activeStory;
const number = new Intl.NumberFormat('en-US');
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let series, candidates, field, context, day, anchors = [], frame = 0, playing = false, playFrame = 0, lastRender = '';
let selectedDay = null, selectedScroll = 0;
let plotScale;
let candidateRequest = 0;
let displayTime, motion = null, lastPaint = -Infinity, pendingScroll = null;
let motionClock = 0, lastFrameTime = null;
let crossAnalysis, cross;
let bothMetadata, bothStory;

function measure() {
  if (!chapters.length) return;
  const focus = innerWidth <= 700 ? $('chart-account').closest('.visual-panel').getBoundingClientRect().bottom + 20 : innerHeight * 0.35;
  const beginning = $('story').getBoundingClientRect().top + scrollY - (innerWidth <= 700 ? 60 : 80);
  anchors = chapters.map((chapter, index) => Math.round(index ? chapter.querySelector('.eyebrow').getBoundingClientRect().top + scrollY - focus : beginning));
  anchors.push(Math.round(chapters.at(-1).getBoundingClientRect().bottom + scrollY - focus));
  lastRender = '';
  schedule();
}

function scrollProgress() {
  const index = anchors.findIndex((anchor, index) => index < anchors.length - 1 && scrollY < anchors[index + 1]);
  if (index < 0) return stops.length;
  return index + clamp((scrollY - anchors[index]) / (anchors[index + 1] - anchors[index]), 0, 1);
}

function seek(date, smooth = false) {
  const position = progressAtDay(stops, date);
  const index = Math.floor(position);
  const top = clamp(anchors[index] + (anchors[index + 1] - anchors[index]) * (position - index), 0, document.documentElement.scrollHeight - innerHeight);
  // Scroll positions round to pixels; preserve the exact day chosen on the slider.
  selectedDay = date;
  pendingScroll = smooth && !reducedMotion.matches ? Math.round(top) : null;
  scrollTo({ top, behavior: pendingScroll === null ? 'instant' : 'smooth' });
  selectedScroll = scrollY;
  if (pendingScroll !== null && Math.abs(scrollY - pendingScroll) <= 1) pendingScroll = null;
  schedule();
}

function schedule() {
  if (!frame && series) frame = requestAnimationFrame(update);
}

function update(timestamp) {
  frame = 0;
  if (!series) return;
  motionClock += lastFrameTime === null ? 0 : clamp(timestamp - lastFrameTime, 0, 50);
  lastFrameTime = timestamp;
  const target = (selectedDay ?? dayAtProgress(stops, scrollProgress())) + 1;
  if (!motion || motion.to !== target) {
    if (motion) displayTime = transitionTime(series, motion.from, motion.to, reducedMotion.matches ? 1 : clamp((motionClock - motion.started) / 450, 0, 1));
    motion = { from: displayTime, to: target, started: motionClock };
  }
  const progress = reducedMotion.matches || motion.from === motion.to ? 1 : clamp((motionClock - motion.started) / 450, 0, 1);
  $('plot').dataset.transitioning = String(progress < 1);
  if (progress < 1 && timestamp - lastPaint < 1000 / 30) { schedule(); return; }
  displayTime = transitionTime(series, motion.from, motion.to, progress);
  if (progress === 1) motion.from = motion.to;
  const state = stateAtTime(series, displayTime);
  day = state.day;
  const count = Math.floor(state.count + 1e-6);
  const zoom = $('zoom').value;
  const [viewStart, viewEnd] = viewWindow(series, day, zoom, plotStart, lastDay);
  plotScale = makeTimeScale(viewStart, viewEnd, displayTime - 1, zoom);
  const key = `${series.handle}-${displayTime.toFixed(5)}-${count}-${viewStart}-${viewEnd}-${zoom}`;
  if (key === lastRender) { if (progress < 1) schedule(); return; }
  lastRender = key;
  lastPaint = timestamp;
  $('plot-tooltip').hidden = true;
  $('follow-count').value = number.format(count);
  $('current-date').textContent = dateFormat.format(day * DAY);
  $('current-date').dateTime = isoDay(day);
  $('count-caption').textContent = day > series.end
    ? `last observed total · ${dateFormat.format(series.end * DAY)}`
    : 'recorded relationships up to this day';
  const controlDay = selectedDay ?? day;
  $('timeline').value = controlDay;
  $('timeline').setAttribute('aria-valuetext', `${dateFormat.format(controlDay * DAY)}; ${number.format(selectedDay === null ? count : countAt(series, controlDay))} recorded relationships`);
  $('reading-progress').style.width = `${clamp((day - firstDay) / (lastDay - firstDay), 0, 1) * 100}%`;
  $('empty-state').hidden = count > 0;
  $('time-cursor').style.left = `${clamp(timePosition(displayTime, plotScale), 0, 1) * 100}%`;
  $('scale-note').textContent = plotScale.share !== null ? '2023 expanded · alignment clipped at ±1.5'
    : !field.gl ? 'Ideology density · brighter means more accounts'
      : 'Alignment clipped at −1.5 and +1.5';
  $('axis-break').hidden = plotScale.share === null;
  $('axis-break').style.left = `${(plotScale.share || 0) * 100}%`;
  drawAxis(plotScale);
  field.draw(day, plotScale, count, cross.draw(displayTime, plotScale));
  context.draw(series, day, plotScale, cross.active);
  $('plot').dataset.start = viewStart;
  $('plot').dataset.end = viewEnd;
  if (progress < 1) schedule();
}

function axisTicks({ start, end, share }) {
  const zoom = $('zoom').value;
  const firstYear = new Date(start * DAY).getUTCFullYear();
  const lastYear = new Date((end - 1) * DAY).getUTCFullYear();
  let ticks = [{ day: start, label: zoom === 'day' ? dateFormat.format(start * DAY) : String(firstYear) }];
  if (zoom === 'campaign' || share !== null) {
    ticks = [1, 2, 3, 4, 5].map(month => {
      const day = dayNumber(`2023-${String(month).padStart(2, '0')}-01`);
      return { day, label: monthFormat.format(day * DAY) };
    });
    ticks.push({ day: end, label: dateFormat.format((end - 1) * DAY).slice(0, 6) });
    if (share !== null) {
      const middleYear = Math.floor((firstYear + 2023) / 2);
      ticks.unshift({ day: start, label: String(firstYear) }, { day: dayNumber(`${middleYear}-01-01`), label: String(middleYear) });
    }
  } else {
    const step = innerWidth < 1000 ? 3 : 2;
    for (let year = firstYear + 1; year < lastYear; year++) {
      if (['all', 'story'].includes(zoom) && year % step === 0) ticks.push({ day: dayNumber(`${year}-01-01`), label: String(year) });
    }
    if (zoom !== 'day') ticks.push({ day: end, label: String(lastYear) });
  }
  return ticks;
}

function drawAxis(scale) {
  const candidates = axisTicks(scale);
  const spacing = 34 / $('plot').clientWidth;
  let previous = -Infinity;
  const ticks = candidates.filter((tick, index) => {
    const x = timePosition(tick.day, scale);
    if (index > 0 && index < candidates.length - 1 && (x - previous < spacing || 1 - x < spacing)) return false;
    previous = x;
    return true;
  });
  $('year-axis').innerHTML = ticks.map(tick => `<span style="left:${timePosition(tick.day, scale) * 100}%">${tick.label}</span>`).join('');
  $('plot-grid').innerHTML = ticks.map(tick => `<span class="grid-line" style="left:${timePosition(tick.day, scale) * 100}%"></span>`).join('');
}

function stopPlaying() {
  playing = false;
  cancelAnimationFrame(playFrame);
  $('play-label').textContent = 'Play';
  $('play-icon').textContent = '▶';
  $('play').setAttribute('aria-label', 'Play the timeline');
}

function togglePlaying() {
  if (playing) return stopPlaying();
  selectedDay = null;
  pendingScroll = null;
  if (day >= lastDay || scrollY >= anchors[chapters.length - 1] - 1) scrollTo({ top: anchors[0], behavior: 'instant' });
  playing = true;
  $('play-label').textContent = 'Pause';
  $('play-icon').textContent = 'Ⅱ';
  $('play').setAttribute('aria-label', 'Pause the timeline');
  let previous;
  const end = anchors[chapters.length - 1];
  const tick = time => {
    if (!playing) return;
    const elapsed = previous ? Math.min(time - previous, 100) : 0;
    previous = time;
    scrollTo({ top: Math.min(end, scrollY + elapsed * end / 70000), behavior: 'instant' });
    if (scrollY >= end - 1) stopPlaying();
    else playFrame = requestAnimationFrame(tick);
  };
  playFrame = requestAnimationFrame(tick);
}

function prepareStory(key, next, initialDate) {
  activeStory = STORIES[key];
  mountNarrative(activeStory, crossAnalysis.candidates[key]);
  cross.setStory(activeStory, crossAnalysis.candidates[key]);
  context.setEvents(activeStory.events);
  chapters = [...document.querySelectorAll('.chapter')];
  stops = chapters.map(chapter => [dayNumber(chapter.dataset.from), dayNumber(chapter.dataset.to), ...(chapter.dataset.focusEnd ? [dayNumber(chapter.dataset.focusEnd)] : [])]);
  firstDay = stops[0][0];
  lastDay = stops.at(-1)[1];
  plotStart = key === 'rte' ? next.start : firstDay;
  selectedDay = initialDate ?? null;
  day = initialDate ?? firstDay;
  displayTime = day + 1;
  motion = null;
  lastPaint = -Infinity;
  motionClock = 0;
  lastFrameTime = null;
  pendingScroll = null;
  $('plot').dataset.transitioning = 'false';
  $('story').hidden = false;
  $('play').disabled = $('timeline').disabled = true;
  $('zoom').value = 'story';
  $('chart-account').textContent = `@${next.handle}`;
  $('follow-count').value = '—';
  $('current-date').textContent = dateFormat.format(day * DAY);
  $('current-date').dateTime = isoDay(day);
  $('empty-state').hidden = true;
  $('plot-tooltip').hidden = true;
  $('selection-status').textContent = `Opening ${activeStory.shortName}’s story…`;
  document.body.dataset.story = key;
  document.title = `${activeStory.shortName} — A following, in time`;
  document.querySelectorAll('[data-enter-story]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.enterStory === key)));
  document.querySelectorAll('[data-total-at]').forEach(element => { element.textContent = number.format(countAt(next, dayNumber(element.dataset.totalAt))); });
  measure();
  plotScale = makeTimeScale(plotStart, lastDay + 1, day, 'story');
  drawAxis(plotScale);
  context.draw(next, day, plotScale);
  $('axis-break').hidden = true;
  $('time-cursor').style.left = `${timePosition(day + 1, plotScale) * 100}%`;
  if (initialDate !== undefined) seek(initialDate);
  else scrollTo({ top: anchors[0], behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  $('score-coverage').textContent = `Loading ${next.name}’s political alignment scores…`;
}

async function chooseCandidate(key, initialDate) {
  const request = ++candidateRequest;
  stopPlaying();
  const next = candidates[key];
  series = null;
  field.clear();
  bothStory?.hide();
  if (key === 'both') {
    $('story').hidden = true;
    document.body.dataset.story = 'both';
    document.title = 'One audience, two clocks — Follow Motivations';
    document.querySelectorAll('[data-enter-story]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.enterStory === key)));
    $('selection-status').textContent = `Opening ${number.format(bothMetadata.total)} shared users’ story…`;
    const { BothStory } = await import('./both-story.js');
    if (request !== candidateRequest) return;
    bothStory ||= new BothStory($('both-story'), bothMetadata);
    await bothStory.open();
    if (request === candidateRequest) $('selection-status').textContent = 'Selected: the shared audience. Choose any of the three stories.';
    return;
  }
  prepareStory(key, next, initialDate);
  await loadIdeology(next);
  if (request !== candidateRequest) return;
  series = next;
  field.setSeries(series);
  cross.setSeries(series);
  $('start-year').textContent = key === 'rte' ? '2009' : '2010';
  $('timeline').min = plotStart;
  $('timeline').max = lastDay;
  $('play').disabled = $('timeline').disabled = false;
  $('coverage-note').textContent = `${number.format(series.total)} recorded relationships · ${series.firstDay} → ${series.lastDay}`;
  $('score-coverage').textContent = `Political alignment: ${number.format(series.ideology.scored)} scored · ${number.format(series.ideology.missing)} without a score`;
  $('ideology-max').textContent = `+${IDEOLOGY_LIMIT}`;
  $('ideology-min').textContent = `−${IDEOLOGY_LIMIT}`;
  $('selection-status').textContent = `Selected: ${activeStory.name}. Choose any of the three stories.`;
  lastRender = '';
  measure();
  const heading = initialDate === undefined ? $('story-title') : [...document.querySelectorAll('.cross-chapter')].find(chapter => dayNumber(chapter.dataset.from) === initialDate)?.querySelector('h2');
  heading?.focus({ preventScroll: true });
}

function replayStory() {
  stopPlaying();
  selectedDay = null;
  pendingScroll = null;
  $('zoom').value = 'story';
  scrollTo({ top: anchors[0], behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  schedule();
}

function wireControls() {
  addEventListener('scroll', () => {
    if (pendingScroll !== null) {
      if (Math.abs(scrollY - pendingScroll) <= 1) { pendingScroll = null; selectedScroll = scrollY; }
    } else if (scrollY !== selectedScroll) selectedDay = null;
    schedule();
  }, { passive: true });
  addEventListener('resize', measure);
  document.addEventListener('toggle', event => { if (event.target.matches('.cross-method')) measure(); }, true);
  for (const event of ['wheel', 'touchstart', 'keydown']) addEventListener(event, () => {
    stopPlaying();
    if (pendingScroll !== null) { pendingScroll = null; selectedDay = null; schedule(); }
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlaying(); });
  $('timeline').addEventListener('input', event => { stopPlaying(); seek(Number(event.target.value)); });
  $('zoom').addEventListener('change', schedule);
  $('play').addEventListener('click', togglePlaying);
  document.addEventListener('click', event => {
    const choice = event.target.closest('[data-enter-story], [data-candidate]');
    if (choice) chooseCandidate(choice.dataset.enterStory || choice.dataset.candidate).catch(scoreError);
    const compare = event.target.closest('[data-compare-story]');
    if (compare) chooseCandidate(compare.dataset.compareStory, dayNumber(compare.dataset.compareDate)).catch(scoreError);
    if (event.target.closest('#replay')) { event.preventDefault(); replayStory(); }
  });
  $('plot').addEventListener('pointermove', event => {
    if (event.target.closest('button')) { $('plot-tooltip').hidden = true; return; }
    const bounds = $('plot').getBoundingClientRect();
    const hoveredDay = Math.floor(timeDay(clamp((event.clientX - bounds.left) / bounds.width, 0, 0.999999), plotScale));
    const tooltip = $('plot-tooltip');
    tooltip.replaceChildren();
    const label = document.createElement('strong');
    label.textContent = dateFormat.format(hoveredDay * DAY);
    tooltip.append(label, hoveredDay > series.end ? 'Outside coverage · no follow estimates for this date.'
      : hoveredDay > day ? 'Scroll forward to reveal this day.' : `${number.format(dailyCount(series, hoveredDay))} estimated follows on this day`);
    const verticalPosition = (event.clientY - bounds.top) / bounds.height;
    const value = ideologyAtPosition(verticalPosition);
    const score = value === null ? null : Number(value.toFixed(2));
    const alignment = score > 0 ? 'Right-leaning · closer to Erdoğan' : score < 0 ? 'Closer to Kılıçdaroğlu' : 'Scale reference';
    const coordinate = document.createElement('div');
    coordinate.textContent = verticalPosition >= 0.92 ? 'No ideology score · separate band'
      : score === null ? '' : `Y · ideology 0 ≈ ${score > 0 ? '+' : ''}${score.toFixed(2)} · ${alignment}`;
    tooltip.append(coordinate);
    tooltip.hidden = false;
    tooltip.style.left = `${clamp(event.clientX - bounds.left + 12, 0, Math.max(0, bounds.width - tooltip.offsetWidth))}px`;
    tooltip.style.top = `${clamp(event.clientY - bounds.top - 58, 0, Math.max(0, bounds.height - tooltip.offsetHeight))}px`;
  });
  $('plot').addEventListener('pointerleave', () => { $('plot-tooltip').hidden = true; });
}

function scoreError(error) {
  console.error(error);
  if (document.body.dataset.story === 'both') {
    $('selection-status').textContent = 'Could not open the paired clocks. Select Both to try again.';
    const status = $('both-renderer-status');
    if (status) status.textContent = 'Paired clocks unavailable. Select Both to try again.';
    $('both-story').setAttribute('aria-busy', 'false');
    return;
  }
  $('score-coverage').textContent = 'Could not load ideology score positions. Reload to try again.';
  $('selection-status').textContent = 'Could not open the score positions. Select a portrait to try again.';
  if (!series) $('follow-count').value = 'Unavailable';
}

async function start() {
  try {
    const [data, analysis, shared] = await Promise.all(['followers.json', 'cross-ideology.json', 'both.json'].map(async file => {
      const response = await fetch(new URL(`./data/${file}`, import.meta.url));
      if (!response.ok) throw new Error(`Data request returned ${response.status}`);
      return response.json();
    }));
    crossAnalysis = analysis;
    bothMetadata = shared;
    candidates = Object.fromEntries(Object.entries(data.candidates).map(([key, candidate]) => [key, makeSeries(candidate)]));
    field = new DotField($('followers'), $('renderer-status'));
    context = new PoliticalContext(event => {
      stopPlaying();
      $('zoom').value = event.date.startsWith('2023') ? 'story' : 'year';
      seek(event.day, true);
    });
    cross = new CrossIdeology(date => { stopPlaying(); seek(date, true); }, () => { lastRender = ''; schedule(); });
    $('data-summary').textContent = `${number.format(candidates.kk.total)} Kılıçdaroğlu relationships and ${number.format(candidates.rte.total)} Erdoğan relationships have dated estimates. The latest day is 26 May 2023.`;
    $('both-selection-count').textContent = `${number.format(shared.total)} shared users`;
    $('selection-status').textContent = 'Choose KK, RTE, or their shared audience.';
    document.querySelectorAll('[data-enter-story]').forEach(button => { button.disabled = false; });
    wireControls();
    document.fonts.ready.then(measure);
  } catch (error) {
    console.error(error);
    $('coverage-note').textContent = 'Could not load the audience. Reload the page to try again.';
    $('renderer-status').textContent = 'The audience plot is temporarily unavailable.';
    $('score-coverage').textContent = 'Ideology positions unavailable.';
    $('follow-count').value = 'Unavailable';
    $('selection-status').textContent = 'Could not load the timelines. Reload the page to try again.';
  }
}

start();
