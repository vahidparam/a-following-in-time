import { DAY, dayNumber } from './story-data.mjs';
import { eventFigure } from './event-media.mjs';

const ballotSource = 'https://www.aa.com.tr/en/politics/ekrem-imamoglu-becomes-istanbul-mayor-after-rerun-polls/1517616';
const format = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const number = new Intl.NumberFormat('en-US');
export const percent = value => `${(value * 100).toFixed(1)}%`;
export const crossDate = value => format.format(dayNumber(value) * DAY);

export const CROSS_STORIES = {
  'justice-afterglow': {
    label: 'After the justice congress', heading: 'A call for justice.<br>A wider <em>circle.</em>',
    text: 'Kılıçdaroğlu’s Justice Congress ran from 26 to 29 August 2017. In the following week, seven in ten scored newcomers were on the Erdoğan-leaning side of our scale.',
    context: 'The congress is nearby context; its role in this shift is unverified.',
    source: 'https://www.digitaljournal.com/article/opposition-chief-says-turkey-has-a-thirst-for-justice/', sourceName: 'AFP · 26 August 2017',
  },
  pandemic: {
    label: 'A pandemic week', heading: 'Doors close.<br>The audience <em>widens.</em>',
    text: 'Schools closed on 16 March 2020 as Türkiye responded to COVID-19. During this week, right-leaning arrivals to Kılıçdaroğlu’s audience increased in volume and share.',
    context: 'A national emergency is the setting. The data records the follows, not their motives.',
    source: 'https://www.unicef.org/turkiye/media/15951/file/Documentation%20of%20Education%20Response%20in%20T%C3%BCrkiye%20during%20the%20COVID-19%20Pandemic.pdf#page=8', sourceName: 'UNICEF · school-closure chronology',
  },
  'runoff-pivot': {
    label: 'The runoff pivot', heading: 'One last week.<br>A different <em>mix.</em>',
    text: 'Between the ballots, Kılıçdaroğlu courted nationalist voters. Victory Party leader Ümit Özdağ endorsed him on 24 May. The week’s newcomers were more often on the positive side of zero.',
    context: 'This is a composition shift: the cross-ideology arrival rate was lower than in the preceding election-heavy month.',
    source: 'https://amp.dw.com/en/turkey-election-anti-migration-party-backs-erdogan-rival/a-65718474', sourceName: 'DW · 24 May 2023',
  },
  'gezi-attention': {
    label: 'Gezi, another audience', heading: 'The streets fill.<br>So does the <em>other half.</em>',
    text: 'As the Gezi protests spread from 31 May 2013, Erdoğan’s account drew a wave of users on the Kılıçdaroğlu-leaning side of the scale. This audience was gathering before his first personally signed tweet.',
    context: 'A follow can record attention during confrontation. The point keeps its original ideology score.',
    source: 'https://www.hrw.org/news/2013/06/01/turkey-end-police-violence-protests', sourceName: 'Human Rights Watch · eyewitness reporting',
  },
  'local-ballot': {
    label: 'The local ballot', heading: 'A local ballot.<br>A wider <em>audience.</em>',
    text: 'Türkiye voted in local elections on 31 March 2019. In that week, almost a third of Erdoğan’s scored newcomers were closer to Kılıçdaroğlu on the ideology scale.',
    context: 'The election and the audience shift overlap. Following the incumbent does not establish support for him.',
    source: ballotSource, sourceName: 'Anadolu Agency · election chronology',
  },
  'runoff-watch': {
    label: 'The other runoff audience', heading: 'Two rivals.<br>Attention flows <em>both ways.</em>',
    text: 'Sinan Oğan endorsed Erdoğan on 22 May, as the runoff campaign intensified. During this same week, a larger share of Erdoğan’s newcomers sat on the Kılıçdaroğlu-leaning side of zero.',
    context: 'Both politicians drew a different ideological mix this week. In both audiences, the cross-ideology arrival rate was below the preceding election-heavy month.',
    source: 'https://www.oscepa.org/en/documents/election-observation/election-observation-statements/turkey/statements-24/4693-2023-presidential-second-round/file', sourceName: 'OSCE / ODIHR · runoff observation report',
  },
};

export function storyMoments(story, analysis) {
  const cross = analysis.features.map(feature => ({ ...CROSS_STORIES[feature.id], ...feature, candidate: story.key, date: feature.start, day: dayNumber(feature.start), kind: 'cross' }));
  const moments = [...story.events.map(event => ({ ...event, kind: 'event' })), ...cross];
  if (cross.some(moment => moment.day < dayNumber(story.introEnd))) {
    moments.push({ kind: 'post', id: 'personal-signature', date: story.tweet.date, day: dayNumber(story.tweet.date) });
  }
  return moments.sort((a, b) => a.day - b.day);
}

export function crossChapter(moment, next) {
  const bar = (label, share) => `<div class="cross-share"><span>${label}</span><strong>${percent(share)}</strong><i style="--share:${share * 100}%"></i></div>`;
  const peak = Math.max(...moment.daily.map(row => row[3]));
  const strongChange = (moment.strongShare - moment.baselineStrongShare) * 100;
  return `<section class="chapter cross-chapter" id="cross-${moment.id}" data-from="${moment.start}" data-to="${next}" data-focus-end="${moment.end}">
    <p class="eyebrow"><span class="cross-symbol" aria-hidden="true">◇</span> THE OTHER SIDE · ${crossDate(moment.start).toUpperCase()}</p>
    <h2 tabindex="-1">${moment.heading}</h2>${eventFigure(moment.id)}<p>${moment.text}</p>
    <figure class="cross-evidence">
      <figcaption><strong>${number.format(moment.cross)}</strong><span>cross-ideology arrivals · ${crossDate(moment.start)} — ${crossDate(moment.end)}</span></figcaption>
      <div class="cross-lens"><canvas width="680" height="280" data-cross-cohort="${moment.id}" aria-label="All arrivals during this seven-day window, magnified. Each dot retains its follow day and ideology score; the opposite side is brighter."></canvas><span class="cross-lens-zero">0</span><span class="cross-lens-caption">SEVEN DAYS, MAGNIFIED · FULL WINDOW</span></div>
      <p class="cross-measure">Cross-ideology share of scored newcomers</p>
      ${bar('Prior 28 days', moment.baselineShare)}${bar('This week', moment.share)}
      <p class="cross-difference">+${(moment.shareChange * 100).toFixed(1)} percentage points <span>· ${moment.rateRatio.toFixed(1)}× the prior daily arrival rate</span></p>
      <div class="cross-days" role="group" aria-label="Cross-ideology arrivals on each day of this week">${moment.daily.map(row => `<button type="button" data-cross-day="${row[0]}" style="--bar:${row[3] / peak * 100}%" aria-label="Explore ${crossDate(row[0])}: ${number.format(row[3])} cross-ideology arrivals" title="${crossDate(row[0])} · ${number.format(row[3])} arrivals"><span>${row[0].slice(8)}</span><i></i></button>`).join('')}</div>
      <p class="cross-peak">Peak · ${crossDate(moment.peakDate)} · ${number.format(moment.peakCross)} arrivals</p>
      <button class="cross-toggle" type="button" data-cross-toggle aria-pressed="true">Spotlight on · show everyone ↗</button>
    </figure>
    <p class="aside-note">${moment.context}</p>
    <a class="cross-source" href="${moment.source}" target="_blank" rel="noopener noreferrer">${moment.sourceName} ↗</a>
    ${moment.start === '2023-05-19' ? `<button class="cross-compare" type="button" data-compare-story="${moment.candidate === 'kk' ? 'rte' : 'kk'}" data-compare-date="${moment.start}">Same week. ${moment.candidate === 'kk' ? 'Erdoğan' : 'Kılıçdaroğlu'}’s audience. <span aria-hidden="true">↗</span></button>` : ''}
    <details class="cross-method"><summary>How we found this week</summary><p>Cross-ideology means positive scores for KK, negative for RTE. Shares use all scored arrivals; zero stays in the denominator and missing scores are excluded. Compare this week with ${crossDate(moment.baselineStart)}–${crossDate(moment.baselineEnd)}.</p><p>Farther from zero (|score| ≥ 0.5): ${percent(moment.strongShare)} this week, ${percent(moment.baselineStrongShare)} before (${strongChange >= 0 ? '+' : ''}${strongChange.toFixed(1)} points). These are account-level estimates, not measurements at follow time.</p><a href="data/cross-ideology.json" download>Download the analysis ↗</a></details>
  </section>`;
}
