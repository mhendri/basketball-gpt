# Adult League — Fall 2026

A responsive single-page basketball schedule and scores app, ready for GitHub Pages. No build step, API key, or Python server is needed.

## Run locally

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. Serve this directory rather than opening index.html directly so the saved data can load.

## Deploy to GitHub Pages

1. Add these files, including `.github/workflows/pages.yml`, to a GitHub repository with a `main` branch.
2. In repository Settings → Pages, select **GitHub Actions** as the source.
3. Push to `main` or run the **Deploy league app** workflow.
4. The workflow's deployment output provides the published URL.

## Data

Source: https://docs.google.com/spreadsheets/d/1IBgQlW1lqmNIjhSQ8v4K33X-zyU2-1aoKHrIYrmLqWY/edit

The app reads Sheet1 using Google's public Visualization endpoint on page load and when Refresh data is clicked. Keep the sheet publicly readable for live updates; no authenticated Google credentials are embedded. A saved snapshot provides an initial view and a clearly labeled fallback if refresh fails. The current adapter reads A1:W100; expand that bound if the source grows beyond it.

The parser supports the sheet's date-across-columns schedule, two time rows, separate playoff block, and Scores section. Scores are matched to scheduled games by date and team names. `Tann` and `Lerm` resolve to their full names. Blank entries remain blank. `Lerman Kaplan` is preserved verbatim because the source omits the separator. Playoff times remain TBD because the source's playoff rows are not labeled with times. Times are displayed exactly as listed, without inventing AM/PM. Dates use the 2026 season; update YEAR and page copy for another season. Today's date uses America/New_York.

This is a read-only viewer; maintain games and scores in the source spreadsheet. Standings are not recalculated or displayed.

## Checks

```sh
node --check app.js
node test.cjs
```
