const commons = 'https://commons.wikimedia.org/wiki/File:';
const photos = {
  gezi: { caption: 'Protest art in Gezi Park · 8 June 2013', alt: 'Painted penguins among the protest art in Gezi Park.', credit: 'Burak Su', source: `${commons}Gezi_park%C4%B1_2013-06-08_(51).jpg`, license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/' },
  justice: { caption: 'The Justice March’s closing rally · 9 July 2017', alt: 'Demonstrators carrying a banner at the Justice rally in Maltepe, Istanbul.', credit: 'Hilmi Hacaloğlu / VOA', source: `${commons}March_for_Justice_-_Istanbul_rally_03.jpg`, license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/' },
};
const illustrations = {
  earthquakes: ['Two shocks. A national emergency.', 'Two sets of concentric rings interrupt a line, symbolising the February earthquakes.'],
  nomination: ['Six parties. One candidate.', 'Six separate lines converge at a single lectern.'],
  'round-one': ['The first presidential ballot.', 'A ballot paper enters a box beneath the number one.'],
  runoff: ['Two ballots. Fourteen days apart.', 'Two ballot boxes connected by a dotted path, representing the two rounds.'],
  'coup-attempt': ['A televised call. A night in the streets.', 'A phone screen and a bridge at night, representing Erdoğan’s televised appeal.'],
  referendum: ['A decision on the system itself.', 'A ballot paper with two choices above the outline of a parliament.'],
  'executive-election': ['An election. A new executive system.', 'A ballot box and the columns of a government building.'],
  'justice-congress': ['A public conversation about justice.', 'An open circle of speech bubbles and dots surrounding the word justice.'],
  pandemic: ['Classrooms close. Public life changes.', 'A school with closed doors, surrounded by empty dotted paths.'],
  'local-ballot': ['A national audience. A local vote.', 'A ballot box beside a row of municipal buildings.'],
};
const aliases = { 'gezi-attention': 'gezi', 'justice-afterglow': 'justice-congress', 'runoff-pivot': 'runoff', 'runoff-watch': 'runoff' };

export function eventFigure(id) {
  const key = aliases[id] || id, photo = photos[key], illustration = illustrations[key];
  if (!photo && !illustration) return '';
  const caption = photo?.caption || illustration[0], alt = photo?.alt || illustration[1];
  const credit = photo ? `<span><a href="${photo.source}" target="_blank" rel="noopener noreferrer">${photo.credit} ↗</a> · <a href="${photo.licenseUrl}" target="_blank" rel="noopener noreferrer">${photo.license}</a> · monochrome crop</span>` : '<span>EDITORIAL ILLUSTRATION</span>';
  return `<figure class="event-media${photo ? ' event-media-photo' : ''}" data-event-media="${key}"><img src="assets/events/${key}.${photo ? 'webp' : 'svg'}" width="720" height="440" alt="${alt}" loading="lazy" decoding="async"><figcaption><span>${caption}</span>${credit}</figcaption></figure>`;
}
