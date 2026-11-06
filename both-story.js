import { clamp, dayNumber } from './story-data.mjs';
import { calendarPosition, decodePairs, gapLabel, pairDate, pairPosition, selectedTotals } from './both-data.mjs';
import { BOTH_EVENTS, mountBothStory } from './both-content.mjs';
import { BothField } from './both-field.js';

const number = new Intl.NumberFormat('en-US');
const date = value => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(Date.parse(`${value}T00:00:00Z`));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export class BothStory {
  constructor(root, metadata) {
    this.root = root; this.meta = metadata;
    this.$ = id => root.querySelector(`#${id}`);
    this.frame = 0; this.reveal = 0; this.fold = 0; this.focus = 0; this.phase = -1;
    this.events = BOTH_EVENTS.map(event => ({ ...event, offset: dayNumber(event.date) - dayNumber(metadata.epoch) }));
    mountBothStory(root, metadata);
    this.chapters = [...root.querySelectorAll('.both-chapter')];
    this.field = new BothField(this.$('both-points'), metadata, this.$('both-renderer-status'));
    this.wire();
  }

  async open() {
    const generation = this.generation = (this.generation || 0) + 1;
    this.active = true; this.root.hidden = false;
    this.root.setAttribute('aria-busy', 'true');
    this.order = 0; this.mode = null; this.zoomOverride = null; this.event = null;
    this.phase = -1; this.reveal = 0; this.fold = 0; this.focus = 0;
    if (!this.data) this.$('both-renderer-status').textContent = `Loading ${number.format(this.meta.total)} paired clocks…`;
    this.$('both-different').checked = false;
    this.measure(); this.seek(0);
    this.drawExample(); this.labels(0, 1, { different: false, campaign: false }); this.axes(0);
    this.$('both-title').focus({ preventScroll: true });
    if (!this.dataPromise) this.dataPromise = this.load().catch(error => { this.dataPromise = null; throw error; });
    this.data = await this.dataPromise;
    if (!this.active || generation !== this.generation) return;
    this.field.setData(this.data);
    this.root.setAttribute('aria-busy', 'false');
    if (this.field.gl) this.$('both-renderer-status').textContent = 'Hover to read both dates for an anonymous account.';
    this.lastTime = null; this.lastKey = ''; this.measure(); this.schedule();
  }

  async load() {
    const response = await fetch(new URL(`./data/${this.meta.file}`, import.meta.url));
    if (!response.ok) throw new Error(`Paired clocks request returned ${response.status}`);
    const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
    return decodePairs(await new Response(stream).arrayBuffer(), this.meta);
  }

  hide() {
    this.active = false; this.generation = (this.generation || 0) + 1;
    cancelAnimationFrame(this.frame); this.frame = 0; this.root.hidden = true;
  }

  measure() {
    if (!this.active) return;
    const focus = innerWidth <= 700 ? 80 + this.root.querySelector('.both-visual').getBoundingClientRect().height : innerHeight * 0.35;
    this.anchors = this.chapters.map((chapter, index) => Math.round(index ? chapter.querySelector('.eyebrow').getBoundingClientRect().top + scrollY - focus : this.root.getBoundingClientRect().top + scrollY - (innerWidth <= 700 ? 60 : 80)));
    this.anchors.push(Math.round(this.chapters.at(-1).getBoundingClientRect().bottom + scrollY - focus));
    this.lastKey = ''; this.schedule();
  }

  progress() {
    if (this.selected !== null) return this.selected;
    const index = this.anchors.findIndex((anchor, i) => i < this.anchors.length - 1 && scrollY < this.anchors[i + 1]);
    return index < 0 ? 7.999 : index + clamp((scrollY - this.anchors[index]) / (this.anchors[index + 1] - this.anchors[index]), 0, 1);
  }

  seek(progress) {
    this.selected = clamp(progress, 0, 7.999);
    const index = Math.floor(this.selected);
    scrollTo({ top: this.anchors[index] + (this.anchors[index + 1] - this.anchors[index]) * (this.selected - index), behavior: 'instant' });
    this.selectedScroll = scrollY; this.schedule();
  }

  schedule() {
    if (this.active && this.data && !this.frame) this.frame = requestAnimationFrame(time => this.update(time));
  }

  update(time) {
    this.frame = 0;
    if (!this.active || !this.data) return;
    const progress = this.progress(), phase = Math.floor(progress);
    if (phase !== this.phase) { this.mode = null; this.zoomOverride = null; this.event = null; this.phase = phase; }
    if (phase < 4) { this.order = 0; this.$('both-different').checked = false; }
    const reveal = phase === 0 ? 0 : phase === 1 ? (this.field.gl ? progress - 1 : 1) : 1;
    const fold = this.mode ?? (phase < 3 || phase === 6 ? 0 : phase === 3 ? progress - 3 : 1);
    const focus = this.zoomTarget = Number(this.zoomOverride ?? phase === 6);
    const weight = reduced.matches ? 1 : 1 - Math.exp(-Math.min(this.lastTime === null ? 16 : time - this.lastTime, 50) / 100);
    this.lastTime = time;
    this.reveal += (reveal - this.reveal) * weight; this.fold += (fold - this.fold) * weight;
    this.focus += (focus - this.focus) * weight;
    if (Math.abs(reveal - this.reveal) < 0.00001) this.reveal = reveal;
    if (Math.abs(fold - this.fold) < 0.0001) this.fold = fold;
    if (Math.abs(focus - this.focus) < 0.0001) this.focus = focus;
    const moving = this.reveal !== reveal || this.fold !== fold || this.focus !== focus;
    const options = { order: this.order || (phase === 2 ? 4 : 0), different: this.$('both-different').checked, campaign: phase === 6, focus: this.focus, event: this.focus > 0.99 ? this.event?.offset ?? -1 : -1 };
    options.population = selectedTotals(this.meta, options.different, options.campaign).total;
    const count = phase === 0 ? 1 : Math.floor(this.meta.total * this.reveal);
    const key = `${phase}-${count}-${this.fold.toFixed(5)}-${this.focus.toFixed(5)}-${options.order}-${options.different}-${options.campaign}-${options.event}`;
    this.root.dataset.transitioning = String(moving);
    if (key !== this.lastKey) {
      this.lastKey = key; this.options = options;
      this.field.draw(phase === 0 ? 0 : this.reveal, this.fold, options);
      this.labels(progress, count, options); this.axes(this.fold); this.drawExample(); this.clearHover();
      this.eventLines();
    }
    this.$('both-progress').value = progress;
    document.getElementById('reading-progress').style.width = `${progress / 7.999 * 100}%`;
    if (moving) this.schedule();
  }

  labels(progress, count, options) {
    const totals = selectedTotals(this.meta, options.different, options.campaign);
    this.$('both-count').value = number.format(count);
    this.$('both-count-caption').textContent = progress < 1 ? 'one real record from the shared audience'
      : this.reveal < 1 ? 'shared users revealed · sorted by the later estimated day'
        : options.different || options.campaign ? `shared users total · ${number.format(totals.total)} match this view` : 'shared users · each point has two dated estimates';
    this.$('both-mode-caption').textContent = this.focus > 0.99 ? '2023, expanded' : this.focus > 0.01 ? 'Expanding 2023…' : this.fold > 0.01 && this.fold < 0.99 ? 'Unfolding the wait…' : this.fold >= 0.5 ? 'The wait between estimates' : 'Two follow dates';
    for (const button of this.root.querySelectorAll('[data-both-view]')) {
      button.disabled = !this.data || this.phase < 3;
      button.setAttribute('aria-pressed', String(Number(button.dataset.bothView) === Math.round(this.fold)));
    }
    for (const button of this.root.querySelectorAll('[data-both-order]')) {
      button.disabled = !this.data || this.phase < 4 || options.different && button.dataset.bothOrder === '3';
      button.setAttribute('aria-pressed', String(Number(button.dataset.bothOrder) === this.order));
    }
    this.$('both-different').disabled = !this.data || this.phase < 4;
    this.$('both-zoom-2023').disabled = !this.data;
    this.$('both-zoom-2023').setAttribute('aria-pressed', String(this.focus > 0.5));
    this.root.dataset.phase = this.phase;
    this.root.dataset.fold = this.fold.toFixed(4);
    this.root.dataset.focus = this.focus.toFixed(4);
  }

  axes(fold) {
    const span = this.field.span, epoch = dayNumber(this.meta.epoch), opened = fold >= 0.5;
    const position = day => calendarPosition(day, span, this.field.split, this.focus);
    const years = this.focus > 0.5
      ? [{ label: '2009', position: 0 }, { label: '2016', position: position(dayNumber('2016-01-01') - epoch) }, ...['Jan', 'Feb', 'Mar', 'Apr', 'May'].map((label, index) => ({ label, position: position(dayNumber(`2023-${String(index + 1).padStart(2, '0')}-01`) - epoch) })), { label: '28 May', position: position(dayNumber('2023-05-28') - epoch) }]
      : [2009, 2013, 2017, 2020, 2023].map(year => ({ label: year, position: position(dayNumber(`${year}-01-01`) - epoch) }));
    const tick = (item, vertical = false) => `<span style="${vertical ? 'bottom' : 'left'}:${item.position * 100}%">${item.label}</span>`;
    this.$('both-x-ticks').innerHTML = years.map(item => tick(item)).join('');
    const gaps = [60, 3600, 86400, 365 * 86400];
    const labels = ['1m', '1h', '1d', '1y'];
    const waitTicks = [{ label: '0', position: 0.5 }];
    for (let i = 0; i < gaps.length; i++) for (const sign of [-1, 1]) waitTicks.push({ label: labels[i], position: 0.5 + sign * Math.log1p(gaps[i]) / Math.log1p(span * 86400) * 0.45 });
    this.$('both-y-ticks').innerHTML = (opened ? waitTicks : years).map(item => tick(item, true)).join('');
    this.$('both-grid').innerHTML = years.map(item => `<i style="left:${item.position * 100}%"></i>`).join('');
    this.$('both-diagonal').style.opacity = 1 - fold; this.$('both-zero').style.opacity = fold;
    this.$('both-y-title').textContent = opened ? 'GAP TO SECOND ESTIMATE · LOG SCALE ↑' : 'RTE · ESTIMATED FOLLOW DAY ↑';
    this.$('both-x-title').textContent = opened ? 'EARLIER FOLLOW DAY · EITHER ACCOUNT →' : 'KK · ESTIMATED FOLLOW DAY →';
    this.$('both-region-kk').textContent = opened ? 'KK ESTIMATE FIRST' : 'KK DAY EARLIER';
    this.$('both-region-rte').textContent = opened ? 'RTE ESTIMATE FIRST' : 'RTE DAY EARLIER';
    this.$('both-reference-note').textContent = this.focus > 0.5 ? '2023 expanded · earlier dates compressed' : opened ? 'Centre · equal timestamp estimates' : 'Diagonal · same UTC day';
  }

  eventLines() {
    const visible = this.focus > 0.05 && this.fold < 0.05;
    this.$('both-events').hidden = !visible;
    const position = day => calendarPosition(day, this.field.span, this.field.split, this.focus);
    const split = position(this.field.split), cutoff = position(dayNumber(this.meta.lastDay) - dayNumber(this.meta.epoch) + 1);
    for (const axis of ['x', 'y']) {
      const divider = this.$(`both-divider-${axis}`), gap = this.$(`both-cutoff-${axis}`);
      divider.hidden = this.focus < 0.05 || axis === 'y' && !visible;
      gap.hidden = !visible;
      divider.style[axis === 'x' ? 'left' : 'bottom'] = `${split * 100}%`;
      gap.style[axis === 'x' ? 'left' : 'bottom'] = `${cutoff * 100}%`;
    }
    const width = this.$('both-plot').clientWidth;
    this.events.forEach(event => {
      const marker = this.root.querySelector(`[data-both-marker="${event.id}"]`), x = position(event.offset);
      marker.querySelector('.both-event-vertical').style.left = `${x * 100}%`;
      marker.querySelector('.both-event-horizontal').style.bottom = `${x * 100}%`;
      const button = marker.querySelector('button');
      button.style.left = `${clamp(x * width - button.offsetWidth / 2, 0, width - button.offsetWidth)}px`;
      button.setAttribute('aria-pressed', String(this.event?.id === event.id));
      marker.classList.toggle('is-active', this.event?.id === event.id);
    });
    if (!this.data) return;
    this.root.querySelectorAll('[data-both-event]').forEach(button => button.setAttribute('aria-pressed', String(this.event?.id === button.dataset.bothEvent)));
    const status = this.$('both-renderer-status');
    if (this.event && this.focus > 0.99) {
      const event = this.event, row = this.meta.daily.find(row => row[0] === event.date);
      const text = event.date > this.meta.lastDay ? '28 May · outside coverage · estimates stop 26 May. ' : `${date(event.date).replace(' 2023', '')} · ${number.format(row?.[1] || 0)} later estimates · ${event.label}. `;
      const link = document.createElement('a'); link.href = event.source; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Source ↗';
      status.replaceChildren(document.createTextNode(`${this.field.gl ? '' : 'Density view · '}${text}`), link);
    } else status.textContent = this.field.gl ? 'Hover to read both dates for an anonymous account.' : 'Density view · brighter areas contain more shared accounts.';
  }

  drawExample() {
    const example = this.meta.example;
    const [x, y] = pairPosition({ kk: dayNumber(example.kk) - dayNumber(this.meta.epoch), rte: dayNumber(example.rte) - dayNumber(this.meta.epoch), gap: example.gapSeconds }, this.field.span, this.fold, this.focus, this.field.split);
    this.$('both-example').style.setProperty('--x', `${x * 100}%`);
    this.$('both-example').style.setProperty('--y', `${(1 - y) * 100}%`);
    this.$('both-example').hidden = this.phase > 0;
  }

  clearHover() {
    this.$('both-tooltip').hidden = this.$('both-hover-point').hidden = true;
  }

  hover(event) {
    if (event.target.closest('button')) return this.clearHover();
    if (!this.data || this.phase < 2 || this.reveal < 1 || this.fold > 0.01 && this.fold < 0.99 || this.focus > 0.01 && this.focus < 0.99) return;
    const bounds = this.$('both-plot').getBoundingClientRect();
    const found = this.field.pick(clamp((event.clientX - bounds.left) / bounds.width, 0, 0.9999), clamp(1 - (event.clientY - bounds.top) / bounds.height, 0, 0.9999), this.fold, this.options);
    if (!found) return this.clearHover();
    const tooltip = this.$('both-tooltip');
    tooltip.replaceChildren();
    for (const text of [`KK · ${date(pairDate(found.kk, this.meta.epoch))}`, `RTE · ${date(pairDate(found.rte, this.meta.epoch))}`, `${found.gap > 0 ? 'KK estimate earlier' : found.gap < 0 ? 'RTE estimate earlier' : 'Equal estimates'} · ${gapLabel(found.gap)}`, `${number.format(found.count)} users in this small region · one real example`]) {
      const line = document.createElement('div'); line.textContent = text; tooltip.append(line);
    }
    tooltip.hidden = false;
    tooltip.style.left = `${clamp(event.clientX - bounds.left + 12, 0, Math.max(0, bounds.width - tooltip.offsetWidth))}px`;
    tooltip.style.top = `${clamp(event.clientY - bounds.top - tooltip.offsetHeight - 10, 0, Math.max(0, bounds.height - tooltip.offsetHeight))}px`;
    const point = this.$('both-hover-point'); point.hidden = false;
    point.style.left = `${found.position[0] * 100}%`; point.style.bottom = `${found.position[1] * 100}%`;
  }

  wire() {
    addEventListener('scroll', () => { if (!this.active) return; if (scrollY !== this.selectedScroll) this.selected = null; this.schedule(); }, { passive: true });
    addEventListener('resize', () => { this.measure(); if (this.active && Number.isFinite(this.selected)) this.seek(this.selected); });
    this.root.addEventListener('toggle', () => this.measure(), true);
    this.$('both-progress').addEventListener('input', event => this.seek(Number(event.target.value)));
    this.$('both-replay').addEventListener('click', () => { this.order = 0; this.mode = null; this.$('both-different').checked = false; this.seek(0); });
    this.$('both-different').addEventListener('change', () => { if (this.order === 3) this.order = 0; this.lastKey = ''; this.schedule(); });
    this.$('both-zoom-2023').addEventListener('click', () => {
      this.zoomOverride = !this.zoomTarget;
      if (this.zoomOverride) this.mode = 0;
      if (this.phase < 3) { this.reveal = 1; this.seek(6.1); }
      this.lastKey = ''; this.schedule();
    });
    this.root.addEventListener('click', event => {
      const view = event.target.closest('[data-both-view]'), order = event.target.closest('[data-both-order]');
      if (view) this.mode = Number(view.dataset.bothView);
      if (order) this.order = Number(order.dataset.bothOrder);
      const eventButton = event.target.closest('[data-both-event]');
      if (eventButton) this.event = this.events.find(item => item.id === eventButton.dataset.bothEvent);
      if (event.target.closest('[data-both-day-toggle]')) this.$('both-different').checked = !this.$('both-different').checked;
      if (view || order || eventButton || event.target.closest('[data-both-day-toggle]')) { this.lastKey = ''; this.schedule(); }
    });
    this.$('both-plot').addEventListener('pointermove', event => this.hover(event));
    this.$('both-plot').addEventListener('pointerleave', () => this.clearHover());
  }
}
