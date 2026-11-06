import { clamp, countAt, dayNumber, timePosition } from './story-data.mjs';
import { CROSS_STORIES, crossDate, percent } from './cross-stories.mjs';
import { ideologyPosition } from './ideology.mjs';

function drawCohort(series, feature, sign, spotlight) {
  const canvas = document.querySelector(`[data-cross-cohort="${feature.id}"]`);
  const context = canvas.getContext('2d');
  if (!context) return;
  const image = context.createImageData(canvas.width, canvas.height);
  const pixels = image.data;
  for (let day = feature.startDay; day <= feature.endDay; day++) {
    for (let point = countAt(series, day - 1); point < countAt(series, day); point++) {
      const score = series.scores[point];
      const fraction = (Math.imul(point + 1, 2654435761) >>> 0) / 4294967296;
      const x = Math.floor((day - feature.startDay + fraction) / 7 * canvas.width);
      const y = Math.floor(ideologyPosition(score) * canvas.height);
      const pixel = (y * canvas.width + x) * 4;
      const alpha = !spotlight || score * sign > 0 ? 0.55 : 0.025;
      pixels[pixel] = pixels[pixel + 1] = pixels[pixel + 2] = 255;
      pixels[pixel + 3] = 255 - (255 - pixels[pixel + 3]) * (1 - alpha);
    }
  }
  context.putImageData(image, 0, 0);
}

export class CrossIdeology {
  constructor(jump, redraw) {
    this.enabled = true;
    document.addEventListener('click', event => {
      const toggle = event.target.closest('[data-cross-toggle]');
      if (toggle) {
        this.enabled = !this.enabled;
        document.querySelectorAll('[data-cross-toggle]').forEach(button => {
          button.setAttribute('aria-pressed', String(this.enabled));
          button.textContent = this.enabled ? 'Spotlight on · show everyone ↗' : 'Spotlight the other side ↗';
        });
        if (this.series) this.paintCohorts();
        redraw();
      }
      const day = event.target.closest('[data-cross-day]');
      const marker = event.target.closest('[data-cross-jump]');
      if (day) jump(dayNumber(day.dataset.crossDay));
      if (marker) jump(this.features.find(feature => feature.id === marker.dataset.crossJump).startDay);
    });
  }

  setStory(story, analysis) {
    this.series = null;
    this.active = null;
    this.enabled = true;
    this.sign = story.key === 'kk' ? 1 : -1;
    this.features = analysis.features.map(feature => ({ ...CROSS_STORIES[feature.id], ...feature, date: feature.start, day: dayNumber(feature.start), startDay: dayNumber(feature.start), endDay: dayNumber(feature.end) }));
    const host = document.getElementById('cross-windows');
    host.innerHTML = this.features.map((feature, index) => `<div class="cross-window" data-cross-window="${feature.id}" style="top:${this.sign > 0 ? 5 : 46}%;height:41%"><button type="button" data-cross-jump="${feature.id}" style="bottom:${index * 20 + 5}px" aria-label="Explore cross-ideology arrivals, ${crossDate(feature.start)} to ${crossDate(feature.end)}" title="${crossDate(feature.start)} · ${percent(feature.share)} cross-ideology">◇</button></div>`).join('');
    this.markers = [...host.children];
  }

  setSeries(series) {
    this.series = series;
    this.paintCohorts();
  }

  paintCohorts() {
    this.features.forEach(feature => drawCohort(this.series, feature, this.sign, this.enabled));
  }

  draw(time, scale) {
    let focus = null;
    this.active = null;
    this.features.forEach((feature, index) => {
      const marker = this.markers[index];
      marker.hidden = feature.endDay < scale.start || feature.startDay >= scale.end;
      const left = clamp(timePosition(feature.startDay, scale), 0, 1);
      const right = clamp(timePosition(feature.endDay + 1, scale), 0, 1);
      marker.style.left = `${left * 100}%`;
      marker.style.width = `max(2px, ${(right - left) * 100}%)`;
      const mix = Math.min(clamp(time - feature.startDay, 0, 1), clamp((feature.endDay + 3 - time) / 2, 0, 1));
      marker.classList.toggle('is-active', mix > 0);
      document.getElementById(`cross-${feature.id}`).classList.toggle('is-cross-active', mix > 0);
      if (mix > 0) this.active = feature;
      if (mix > 0 && this.enabled) focus = { start: feature.startDay, end: feature.endDay + 1, sign: this.sign, mix };
    });
    document.getElementById('plot').dataset.cross = focus ? this.features.find(feature => feature.startDay === focus.start).id : '';
    return focus;
  }
}
