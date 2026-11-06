import { DAY, dayNumber } from './story-data.mjs';
import { eventChapter } from './story-events.js';
import { crossChapter, storyMoments } from './cross-stories.mjs';

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function mountNarrative(story, analysis) {
  const post = story.tweet;
  const end = story.events.at(-1).date;
  const moments = storyMoments(story, analysis);
  const openingEnd = dayNumber(story.introEnd) < moments[0].day ? story.introEnd : moments[0].baselineStart;
  document.getElementById('narrative').innerHTML = `
    <section class="chapter introduction" data-from="${story.start}" data-to="${openingEnd}">
      <p class="eyebrow"><span class="small-line"></span> ${story.name.toUpperCase()}</p>
      <h2 id="story-title" tabindex="-1">${story.heading}</h2>
      <p class="standfirst">${story.opening}</p>
      <div class="account-origin"><span class="origin-mark" aria-hidden="true">+</span><p><span>${story.originDate}</span>${story.origin}</p></div>
      <figure class="first-post">
        <div class="post-author"><img src="${story.portrait}" width="44" height="44" alt="${story.name}"><div><strong>${story.name}</strong><span>@${story.handle}</span></div><span class="post-number">001</span></div>
        <blockquote lang="tr">${post.text}</blockquote>
        <figcaption><time datetime="${post.date}">${dateFormat.format(dayNumber(post.date) * DAY).toUpperCase()}</time><a href="${post.url}" target="_blank" rel="noopener noreferrer">${post.label} ↗</a></figcaption>
      </figure>
      <p class="translation">“${post.translation}” <a href="${post.source}" target="_blank" rel="noopener noreferrer">Source ↗</a></p>
      ${story.note ? `<p class="aside-note origin-note">${story.note}</p>` : ''}
      <a class="scroll-invitation" href="#first-follows"><span aria-hidden="true">↓</span> SCROLL TO LET TIME PASS</a>
    </section>
    <section class="chapter" id="first-follows" data-from="${openingEnd}" data-to="${moments[0].date}">
      <p class="eyebrow"><span class="small-line"></span> THE FIRST CONNECTIONS</p>
      <h2>${story.firstHeading}</h2><p>${story.firstText}</p>
      <div class="ideology-explainer">
        <h3>Read the <em>height.</em></h3>
        <p>A dot tells us when someone arrived. Its height shows their estimated political alignment.</p>
        <dl><div><dt>+ Above zero</dt><dd>Right-leaning, closer to Erdoğan.</dd></div><div><dt>− Below zero</dt><dd>Closer to Kılıçdaroğlu.</dd></div><div><dt>0 The reference</dt><dd>The scale’s dividing line.</dd></div></dl>
        <p>As ${story.shortName}’s audience grows, watch which side of zero the new dots join.</p>
      </div>
      <p class="aside-note">The scale stays the same in both stories. Scores beyond ±1.5 appear at the edges; users without a score sit in a separate band.</p>
      <div class="chapter-stat"><strong data-total-at="${openingEnd === story.introEnd ? story.milestone : openingEnd}">—</strong><span>${openingEnd === story.introEnd ? story.milestoneLabel : `recorded relationships by ${dateFormat.format(dayNumber(openingEnd) * DAY)}`}</span></div>
      <p class="aside-note">Scroll slowly. Or go back. Time here moves with you.</p>
    </section>
    <div id="political-chapters">${moments.map((moment, index) => {
      const next = moments[index + 1]?.date || end;
      if (moment.kind === 'cross') return crossChapter(moment, next);
      if (moment.kind === 'event') return eventChapter(moment, next, story.events.findIndex(event => event.id === moment.id));
      return `<section class="chapter signature-chapter" data-from="${moment.date}" data-to="${next}"><p class="eyebrow">09 FEBRUARY 2015</p><h2>A voice.<br>A <em>signature.</em></h2><p>The account’s audience is already here when Erdoğan sends his first personally signed tweet. Its call to quit smoking marks a new voice in an older account.</p><div class="chapter-stat"><strong data-total-at="${story.milestone}">—</strong><span>${story.milestoneLabel}</span></div><a class="cross-source" href="${post.url}" target="_blank" rel="noopener noreferrer">Read the personally signed tweet ↗</a></section>`;
    }).join('')}</div>
    <section class="chapter exploration" id="explore" data-from="${end}" data-to="${end}">
      <p class="eyebrow"><span class="small-line"></span> ANOTHER PERSPECTIVE</p>
      <h2>One audience.<br>Another <em>story.</em></h2>
      <p>You’ve followed ${story.shortName}’s timeline. Revisit a moment, replay this story, or step into the other audience.</p>
      <div class="candidate-switch" role="group" aria-label="Choose a storyline"><button type="button" data-candidate="kk" aria-pressed="${story.key === 'kk'}">Kılıçdaroğlu <span>KK</span></button><button type="button" data-candidate="rte" aria-pressed="${story.key === 'rte'}">Erdoğan <span>RTE</span></button><button type="button" data-candidate="both">Shared audience <span>Both</span></button></div>
      <a class="replay-link" id="replay" href="#story">Read this story again <span aria-hidden="true">↺</span></a>
      <a class="replay-link" href="#top">Choose another story <span aria-hidden="true">↑</span></a>
    </section>`;
}
