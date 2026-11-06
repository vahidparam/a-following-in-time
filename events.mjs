import { countAt, dayNumber } from './story-data.mjs';

const electionSource = 'https://odihr.osce.org/odihr/elections/turkiye/553963';

export const EVENTS = [
  {
    id: 'gezi', date: '2013-05-28', label: 'Gezi Park',
    heading: 'A park.<br>A public <em>square.</em>',
    text: 'Protests against the redevelopment of Gezi Park begin in Istanbul. Put the political moment beside the pattern of follows: attention can leave traces in more than one place.',
    source: 'https://www.amnesty.org/en/latest/news/2013/05/turkey-must-halt-brutal-police-repression-and-investigate-abuses-at-istanbul-protest/',
    sourceName: 'Amnesty International',
  },
  {
    id: 'justice', date: '2017-06-15', label: 'Justice March',
    heading: 'A long walk.<br>A public <em>stand.</em>',
    text: 'Kılıçdaroğlu begins the Justice March from Ankara to Istanbul. It ends with a rally in Maltepe on 9 July. Follow the same weeks in the field of dots.',
    source: 'https://chp.org.tr/haberler/genel-baskan-kemal-kilicdaroglunun-maltepe-adalet-mitingi-konusmasi-9-temmuz-2017',
    sourceName: 'CHP speech archive',
  },
  {
    id: 'earthquakes', date: '2023-02-06', label: 'Earthquakes',
    heading: 'The ground<br><em>shifts.</em>',
    text: 'Two devastating earthquakes strike Türkiye and Syria. A national emergency unfolds in the months before the election. Here, we slow the timeline to see the surrounding days.',
    source: 'https://www.usgs.gov/news/featured-story/m78-and-m75-kahramanmaras-earthquake-sequence-near-nurdagi-turkey-turkiye',
    sourceName: 'U.S. Geological Survey',
  },
  {
    id: 'nomination', date: '2023-03-06', label: 'KK nominated',
    heading: 'An opposition leader.<br>Now a <em>candidate.</em>',
    text: 'The six-party Nation Alliance names Kılıçdaroğlu as its presidential candidate to challenge Erdoğan. The campaign now has its two principal opponents.',
    source: 'https://apnews.com/article/2d52c9df538ea6f1b6f915b781ef2742',
    sourceName: 'Associated Press',
  },
  {
    id: 'round-one', date: '2023-05-14', label: 'Election · I',
    heading: 'The first<br><em>ballot.</em>',
    text: 'Türkiye holds presidential and parliamentary elections. This is the first of two presidential ballots. Compare the estimated follows in the week before voting with the week beginning on election day.',
    source: electionSource, sourceName: 'OSCE / ODIHR',
  },
  {
    id: 'runoff', date: '2023-05-28', label: 'Runoff · II',
    heading: 'A second ballot.<br>An unfinished <em>picture.</em>',
    text: 'The presidential election goes to a second round. Our follow estimates end on 26 May, two days earlier. The hatched space marks what we cannot see; no new dots are added for the runoff.',
    source: electionSource, sourceName: 'OSCE / ODIHR',
  },
].map(event => ({ ...event, day: dayNumber(event.date) }));

export const RTE_EVENTS = [
  {
    id: 'coup-attempt', date: '2016-07-15', label: 'Coup attempt',
    heading: 'A night.<br>A call to the <em>streets.</em>',
    text: 'During the military coup attempt, Erdoğan calls on supporters to take to the streets through a televised video call. Public attention moves between screens, streets, and social media. The dates let us inspect the surrounding follows.',
    source: 'https://www.aa.com.tr/en/july-15-coup-bid/foreign-envoys-describe-turkeys-july-15-coup-attempt/861049',
    sourceName: 'Anadolu Agency',
  },
  {
    id: 'referendum', date: '2017-04-16', label: 'Referendum',
    heading: 'A vote on<br>the shape of <em>power.</em>',
    text: 'Türkiye votes on constitutional changes to replace the parliamentary system with an executive presidency. A major political decision becomes another date against which to read the audience’s growth.',
    source: 'https://odihr.osce.org/odihr/elections/turkey/324816',
    sourceName: 'OSCE / ODIHR',
  },
  {
    id: 'executive-election', date: '2018-06-24', label: '2018 election',
    heading: 'A new system.<br>A familiar <em>president.</em>',
    text: 'Elections choose the president and parliament for the new executive system. Erdoğan wins another presidential term. Look at the week around the vote, then at the years that follow.',
    source: 'https://cdn.osce.org/sites/default/files/f/documents/9/4/397046_0.pdf',
    sourceName: 'OSCE / ODIHR',
  },
  {
    ...EVENTS.find(event => event.id === 'earthquakes'),
    text: 'The February earthquakes put rescue, relief, and reconstruction at the centre of public life before the election. Watch Erdoğan’s audience through the same days, using the same measurement as Kılıçdaroğlu’s story.',
  },
  {
    ...EVENTS.find(event => event.id === 'round-one'),
    text: 'Erdoğan contests another presidential election. The first ballot is held alongside parliamentary elections; the presidential contest continues to a second round. Compare the daily estimated follows around this first vote.',
  },
  EVENTS.find(event => event.id === 'runoff'),
].map(event => ({ ...event, day: dayNumber(event.date) }));

export function eventAt(day, events = EVENTS) {
  return events.findLast(event => event.day <= day);
}

export function eventComparison(series, event) {
  const average = (start, end) => start < series.start || end > series.end
    ? null : (countAt(series, end) - countAt(series, start - 1)) / 7;
  return {
    before: average(event.day - 7, event.day - 1),
    after: average(event.day, event.day + 6),
  };
}
