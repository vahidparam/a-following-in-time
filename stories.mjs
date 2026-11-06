import { EVENTS, RTE_EVENTS } from './events.mjs';

export const STORIES = {
  kk: {
    key: 'kk', name: 'Kemal Kılıçdaroğlu', shortName: 'Kılıçdaroğlu', handle: 'kilicdarogluk',
    portrait: 'assets/kemal-kilicdaroglu.jpg', start: '2010-06-10', introEnd: '2010-08-27',
    originDate: '10 JUNE 2010', origin: 'Kemal Kılıçdaroğlu joins Twitter.',
    heading: 'Before the crowd,<br>a single <em>post.</em>',
    opening: 'An audience doesn’t appear all at once. It arrives one person at a time.',
    tweet: {
      date: '2010-08-27', label: 'First post',
      text: 'Sevgili twitter kullanıcıları, bundan sonra programımı ve önemli konuları buradan sizlerle paylaşacağım.',
      translation: 'Dear Twitter users, from now on I will share my schedule and important topics with you here.',
      url: 'https://x.com/kilicdarogluk/status/22269383985',
      source: 'https://www.haberturk.com/yenimedya/haber/1157323-ilk-tweetlerini-hatirliyor-musunuz',
    },
    firstHeading: 'Someone<br>presses <em>follow.</em>',
    firstText: 'Then someone else. A small decision, repeated, begins to form an audience. Follow it through protest, a march for justice, and a presidential campaign.',
    milestone: '2012-12-31', milestoneLabel: 'recorded relationships dated by the end of 2012',
    events: EVENTS,
  },
  rte: {
    key: 'rte', name: 'Recep Tayyip Erdoğan', shortName: 'Erdoğan', handle: 'RTErdogan',
    portrait: 'assets/recep-tayyip-erdogan.jpg', start: '2009-08-22', introEnd: '2015-02-09',
    originDate: 'AUGUST 2009', origin: 'The account opens, initially run by supporters.',
    heading: 'Before his words,<br>an <em>audience.</em>',
    opening: 'The account begins with supporters in 2009. Let the years unfold toward Erdoğan’s first personally signed tweet in 2015, as its audience gathers.',
    tweet: {
      date: '2015-02-09', label: 'First personally signed tweet',
      text: 'Bugün 9 Şubat Dünya Sigarayı Bırakma Günü. Bu zehre karşı sen de iradene sahip ol ve #SigarayaTeslimOlma RTE',
      translation: 'Today is 9 February, the day to quit smoking. Show your resolve against this poison. Don’t surrender to cigarettes. RTE',
      url: 'https://x.com/RTErdogan/status/564775416704278528',
      source: 'https://www.tgrthaber.com/aktuel/iste-cumhurbaskani-erdoganin-ilk-tweeti-52790',
    },
    note: 'Scroll through the account’s early years to 9 February 2015, the first personally signed tweet documented in contemporary reporting. Its earlier audience builds along the way.',
    firstHeading: 'A following<br>before a <em>signature.</em>',
    firstText: 'An audience forms before his first personal signature. Follow its early years, then its growth through a coup attempt, a referendum, and presidential elections.',
    milestone: '2015-02-09', milestoneLabel: 'recorded relationships dated by his first personally signed tweet',
    events: RTE_EVENTS,
  },
};
