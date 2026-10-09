# Research Radar

A dependency-free dashboard for major AI, bioinformatics, medical-imaging, genomics and proteomics conferences, and relevant CSHL, EMBL, EMBL-EBI and Wellcome Sanger training.

## Run locally

```sh
cd research-radar
python -m http.server 8000
```

Open http://localhost:8000. Use an HTTP server, not a `file://` URL, because the app loads JavaScript modules and JSON.

```sh
npm test
```

There are no npm runtime dependencies, API keys, paid AI calls, build step or database. Node is required only for validation and tests. Vercel can serve this folder as a static project; choose Framework: Other, no build command, and use this folder as the root directory. The deployment fits static hosting on the free Hobby tier, subject to the account's plan and usage limits. Deployment protection follows the existing project settings.

## What works

- Search and filter by topic, event type, deadline status and research relevance.
- Compare event location, dates, abstract/application deadlines and paper deadlines.
- View official sources, last verification dates, uncertainties and Singapore time conversions.
- Save a shortlist in browser local storage.
- Export filtered CSV and upcoming deadlines as iCalendar. The calendar export is a snapshot, not a live subscription. Unknown cutoff times remain all-day reminders.
- Refresh the published catalog on opening, via the Refresh data button and every 15 minutes while the page is visible.

## Data and scheduled updates

`events.json` is the source of truth. The app fetches the public file from:

https://raw.githubusercontent.com/akashbahai/test/master/research-radar/events.json

It falls back to the bundled file and the last successfully loaded browser copy if GitHub is unavailable. It never replaces a newer catalog with an older version. A review-age warning appears after three days. The Refresh data button loads the catalog; it does **not** crawl conference websites.

An external ChatGPT scheduled research task checks official sources daily around 08:00 Asia/Singapore and commits verified catalog updates using the connected GitHub app. Scheduling is external to this repository; see `maintenance.md`. Source checks do not require the browser to remain open. The scheduled task depends on that ChatGPT task and GitHub connection remaining enabled; merely copying this repository does not recreate the schedule. Data-only commits become visible without redeployment. Source-code changes require a Vercel deployment.

## Files

| File | Purpose |
| --- | --- |
| `index.html`, `styles.css` | Accessible responsive interface |
| `app.js` | Catalog loading, filters, shortlist, detail dialog and exports |
| `core.js` | Date/status logic, CSV safety and iCalendar generation |
| `events.json` | Verified events and explicit next-edition/provider watchlists |
| `maintenance.md` | Research/update procedure and schedule metadata |
| `scripts/validate.mjs` | Catalog integrity checks |
| `tests/core.test.mjs` | Cutoff conversion, gate and export tests |
| `vercel.json` | Static deployment and security/cache headers |

## Deadline policy

Dates come from official organizers. Missing dates are `null`, never estimated from a prior edition. Abstract registration, proceedings papers, standalone posters and course applications remain distinct. A passed mandatory abstract gate prevents the associated full-paper deadline from being shown as an open route for new submissions. When an independent later track exists, it can remain available. Exact times are converted from the source timezone; dates with no verified time do not get fabricated midnight timestamps.

Relevance is an editorial assessment against biomedical AI, proteomics, multi-omics, genomic cohorts, biological foundation models and medical imaging. This is a curated tracker, not an exhaustive global directory. Provider watchlists and future editions are labelled separately from confirmed events.

Public repository contents contain only public event facts and generic research interests. No biomedical data or credentials are required. Shortlist preferences stay in the browser.
