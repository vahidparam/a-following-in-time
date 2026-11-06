import { eventAt, eventComparison } from './events.mjs';
import { DAY, clamp, timePosition } from './story-data.mjs';
import { percent } from './cross-stories.mjs';
import { eventFigure } from './event-media.mjs';

const $ = id => document.getElementById(id);
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const indexLabel = index => String(index + 1).padStart(2, '0');

export function eventChapter(event, next, index) {
  return `
    <section class="chapter event-chapter" id="event-${event.id}" data-from="${event.date}" data-to="${next}">
      <p class="eyebrow"><span class="context-index">${indexLabel(index)}</span> ${dateFormat.format(event.day * DAY).toUpperCase()}</p>
      <h2>${event.heading}</h2>
      ${eventFigure(event.id)}
      <p>${event.text}</p>
      <div class="event-links"><button type="button" data-event-jump="${event.id}">Explore this moment <span aria-hidden="true">→</span></button><a href="${event.source}" target="_blank" rel="noopener noreferrer">${event.sourceName} ↗</a></div>
      ${index === 0 ? '<p class="aside-note">Events give the dates context. A change in estimated follows does not establish its cause.</p>' : ''}
    </section>`;
}

export class PoliticalContext {
  constructor(jump) {
    this.setEvents([]);
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-event-jump]');
      if (button) jump(this.events.find(item => item.id === button.dataset.eventJump));
    });
  }

  setEvents(events) {
    this.events = events;
    this.descriptionKey = null;
    $('plot-events').innerHTML = events.map((event, index) => `
      <div class="plot-event" data-event="${event.id}">
        <span class="event-rule" aria-hidden="true"></span>
        <button type="button" data-event-jump="${event.id}" aria-label="Explore ${event.label}, ${dateFormat.format(event.day * DAY)}"><span>${indexLabel(index)}</span> ${event.label}</button>
      </div>`).join('');
    this.markers = [...$('plot-events').children];
  }

  draw(series, day, scale, cross = null, filtered = false) {
    const { start, end } = scale;
    const active = eventAt(day, this.events);
    const width = $('plot').clientWidth;
    const lanes = [];
    this.events.forEach((event, index) => {
      const marker = this.markers[index];
      marker.hidden = event.day < start || event.day >= end;
      marker.classList.toggle('is-past', event.day <= day);
      marker.classList.toggle('is-active', event === active && !cross);
      marker.classList.toggle('outside-data', event.day > series.end);
      const button = marker.querySelector('button');
      button.setAttribute('aria-pressed', String(event === active && !cross));
      if (marker.hidden) return;
      const x = timePosition(event.day + 0.5, scale) * width;
      const left = clamp(x - button.offsetWidth / 2, 0, width - button.offsetWidth);
      let lane = lanes.findIndex(right => right + 6 < left);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = left + button.offsetWidth;
      button.style.left = `${left}px`;
      button.style.top = `${lane * 21 + 6}px`;
      marker.querySelector('.event-rule').style.left = `${x}px`;
    });
    this.drawGap(series, scale, width);
    this.describe(series, cross || active, Boolean(cross), filtered);
  }

  drawGap(series, scale, width) {
    const gap = $('data-gap');
    gap.hidden = scale.end <= series.end + 1;
    const left = clamp(timePosition(series.end + 1, scale), 0, 1);
    gap.style.left = `${left * 100}%`;
    gap.classList.toggle('is-wide', (1 - left) * width > 130);
  }

  describe(series, event, cross = false, filtered = false) {
    const key = `${series.handle}-${cross}-${filtered}-${event?.id}`;
    if (key === this.descriptionKey) return;
    this.descriptionKey = key;
    $('context-date').textContent = event ? dateFormat.format(event.day * DAY) : 'POLITICAL CONTEXT';
    $('context-title').textContent = event?.label || 'Political moments along the way';
    $('context-source').hidden = !event;
    if (event) {
      $('context-date').dateTime = event.date;
      $('context-source').href = event.source;
      $('context-source').setAttribute('aria-label', `Source: ${event.sourceName}`);
    } else $('context-date').removeAttribute('datetime');
    let description = 'Scroll, or select a plot marker to explore a moment.';
    if (cross) {
      description = `${filtered ? 'Cross-ideology users only' : 'Everyone shown'} · ${percent(event.baselineShare)} → ${percent(event.share)} cross-ideology share · ${event.rateRatio.toFixed(1)}× prior rate`;
    } else if (event) {
      const { before, after } = eventComparison(series, event);
      description = before !== null && after !== null
        ? `7-day daily average: ${number.format(before)} before → ${number.format(after)} from this date`
        : `Outside coverage · follow estimates end ${dateFormat.format(series.end * DAY)}`;
    }
    $('context-comparison').textContent = description;
  }
}
