# A following, in time

Interactive science communication and data-driven storytelling by
[Vahid Khalili Param](https://vahidparam.com/), a PhD candidate at Sabancı
University and graduate research assistant in the [VRL Lab](https://varollab.com/index.html).

Explore three stories about political audiences in Türkiye:

- **Kılıçdaroğlu:** follow the growth and political alignment of his recorded audience.
- **Erdoğan:** explore his audience through protests, political milestones, and elections.
- **Both:** unfold the two estimated follow dates of 5,530,938 shared accounts.

Scrolling moves through time. Plot markers, playback, zoom controls, and the
shared-audience views let readers explore the data directly. The closing section
connects the feature to Vahid’s portfolio and the lab’s wider research.

## Website files

| Files | Purpose |
| --- | --- |
| `index.html`, `styles.css` | Opening page, layout, methods, and portfolio section |
| `story.js`, `story-data.mjs`, `timeline-motion.mjs` | Scrolling, dates, playback, and smooth transitions |
| `stories.mjs`, `story-content.js` | Individual narrative text and first posts |
| `events.mjs`, `story-events.js` | Political milestones, sources, and plot markers |
| `ideology.mjs`, `dot-field.js` | Political alignment and audience rendering |
| `cross-stories.mjs`, `cross-ideology.js` | Cross-ideology passages and cohort views |
| `both-*.mjs`, `both-*.js`, `both.css` | Shared-audience story, paired dates, and unfolding |
| `event-media.mjs`, `assets/` | Event imagery, portraits, illustrations, and credits |
| `data/` | The six anonymous data files needed by the browser |

## Visualization data

Only these six data files are included:

| File | Purpose |
| --- | --- |
| `followers.json` | Daily counts and alignment coverage for the two audiences |
| `cross-ideology.json` | Anonymous daily summaries and featured seven-day windows |
| `both.json` | Shared-audience counts and paired-date metadata |
| `kk-ideology0.f32.gz` | Anonymous political-alignment coordinates for KK’s audience |
| `rte-ideology0.f32.gz` | Anonymous political-alignment coordinates for RTE’s audience |
| `both-pairs.u16i32.gz` | Anonymous paired follow days and estimated gaps |

The browser needs these files to draw the audiences. Keep the binary files
compressed; the application decompresses them when a reader chooses a story.
Individual follower IDs, handles, and profiles are not included.

The individual stories contain 11,401,981 KK relationships and 21,246,042 RTE
relationships. Dates are estimates, not a reconstruction of historical live
follower totals. Ideology is an account-level estimate, not a measurement at the
follow date. Positive scores are interpreted as right-leaning and closer to
Erdoğan; negative scores are closer to Kılıçdaroğlu. Both stories clip the visible
scale to ±1.5, with a separate band for missing scores.

The shared story preserves two follow-date estimates per account. The calendar
map uses the KK day on X and RTE day on Y; the unfolded view shows the earlier
day and a signed logarithmic gap. Same-day estimates and equal timestamps are
different categories. Estimated order does not establish the order of actual
clicks, continuous simultaneous following, or political preference.

All estimates end on 26 May 2023. Hatching marks the unobserved period through
the runoff on 28 May. Political events provide context, not evidence of causation.
Detailed measurement explanations and source links appear in the website.

## Images and attribution

Archive photographs have visible credits and licence links. Original SVG
illustrations are symbolic editorial artwork rather than quantitative plots or
historical photographs. See [assets/CREDITS.md](assets/CREDITS.md) for attribution.
