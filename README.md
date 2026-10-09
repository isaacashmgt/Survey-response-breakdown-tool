# DiscoverWorks analysis dashboard

An internal exploration workspace for the Ballmer evaluation team’s 2026 final data.

**Live dashboard:** https://isaacashmgt.github.io/Survey-response-breakdown-tool/

## Team workflow

1. Open the linked **2026 Internal Analysis Dashboard Data** Google Sheet with an account that has access.
2. Choose **File → Download → Microsoft Excel (.xlsx)**. Keep the entire workbook.
3. Drop the workbook into the dashboard. Parsing happens locally in a browser worker.
4. Choose a survey/data view and scroll through its questions. No question selection or report generation is required.
5. Optionally choose a breakdown: another question in the same survey, a site characteristic, or a grantee characteristic.
6. Charts open by default. Use the optional filters to narrow the population, or switch to Breakdown tables without losing the analysis setup. The question search helps find a question; it does not change the population.

Workbook data stays in browser memory. This repository and the public Pages site contain application code and branding only. The private workbook and frozen source tables are not changed by the dashboard.

## Application files

- `index.html`: workbook instructions and exploration workspace.
- `explorer.css`: exploration layout; `style.css` supplies existing branding and landing-page styles.
- `explorer.js`: shared controls, filtering, lazy question rendering, tables/charts, and optional CSV/PNG exports.
- `explorer-data.js`: question catalog, common breakdown catalogs, exact-key left joins, multi-select handling, and response ordering.
- `explorer-worker.js`: reads the recognized workbook tabs using SheetJS. It returns only the tab values needed by the explorer.

The previous general-purpose interface files remain in the repository for history and compatibility; they are not loaded by the exploration page.

## Analysis conventions

- The six supported tabs are Educator Clean, Family - Family Level, Family - Child Level, Student Clean, Site Level, and Grantee Level. README, Refresh Status, and Data Dictionary are supporting tabs, not analysis views.
- Question lists exclude IDs, metadata, provenance, quality flags, and narrative fields. Matrix questions combine the parent prompt with the sub-item. Helper checkbox columns are hidden when a parent multi-select field exists. Student questions 9 and 10 group their option fields into their parent question.
- Breakdown catalogs are reusable lists by source; they do not depend on the question currently being displayed. No distinct-value-count rule decides whether something is a survey question.
- Site/grantee attributes join automatically by resolved MGT IDs. Student `site_code`/`grantee_code` correspond to site/grantee IDs. Missing or duplicate secondary keys never multiply or remove primary records.
- Family-level answers remain at family-response grain. Families with multiple sites are not expanded into repeated household answers. Use child questions for child/site comparisons.
- Student Survey includes records marked survey-available or containing survey answers. Assessment records without survey responses are not treated as survey respondents. The explorer preserves included LinkIt record grain; it does not collapse records by Final Temp ID.
- Percentages use records answering the question within each group. Missing answers are shown separately. Checkbox questions with explicit zeroes are answered even when no option was selected.
- Multi-select questions can total above 100%. Multi-select breakdown groups overlap; their bases must not be summed.
- Numeric questions show count, missing count, mean, median, minimum, and maximum. Numeric characteristics offered as categorical breakdowns use explicitly labeled fixed ranges.
- Chart answer options stay on the vertical axis. Breakdowns use grouped horizontal bars, with the breakdown question or characteristic above the category legend. Each bar uses the answering records within its own group as the denominator.
- CSV exports include question, breakdown, counting unit, filter context, answered/missing bases, and source workbook. Chart downloads include question and analysis context. Charts with more than six groups use pages while keeping every answer option visible; tables retain all groups.

## Deployment

GitHub Pages serves the repository root from `main`. Push application changes to `main` to publish. No database, workbook credentials, or server-side data ingestion is needed.

For local preview, run `python3 -m http.server 8873 --bind 127.0.0.1` in this directory and open http://127.0.0.1:8873/.

`npm run build` packages the application routes for the existing worker-style deployment. Pages serves the source files directly.
