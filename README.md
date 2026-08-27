# Apache Camel Kameleon

Dashboard that shows CVE vulnerabilities in Apache Camel, built on the PatternFly 6
**Compass** application shell (React + Vite + TypeScript).

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # typecheck + production bundle into dist/
npm run typecheck
```

## Layout

The shell follows the Compass pattern: a docked navigation rail, a header that pages fill
in themselves, a scrollable main panel and a status footer. An end drawer, owned by the
shell, hosts CVE detail panels.

```
Drawer (detail panel)
└── Compass
    ├── dock  → AppDock          docked Masthead + Nav rail
    └── main  → AppMain
                ├── CompassHeader  → TopMiddle (page nav, page tools, theme toggle)
                ├── CompassContent → MainRoutes (lazily loaded pages)
                └── CompassMainFooter → AppFooter (CVE counters, last scan)
```

## Source map

| Path | Contents |
| --- | --- |
| `src/ui/compass` | Compass shell: `App`, `AppCompass`, `AppSideBar`, `AppMain`, `TopMiddle`, `AppFooter` |
| `src/ui/compass/navigation` | Route table, dock menu, lazy route definitions, fallbacks |
| `src/ui/compass/theme` | Light/dark theme context and toggle (`pf-v6-theme-dark`) |
| `src/ui/pages` | `dashboard`, `cves`, `components`, `versions`, `about` |
| `src/ui/shared/ui` | Severity/status labels, error boundary |
| `src/stores` | Zustand stores: CVE data + filters, dock/page UI state |
| `src/api/CveApi.ts` | Data access layer (currently fixture backed) |
| `src/data` | Sample advisory fixtures |
| `src/models/CveModels.ts` | `Cve`, `Severity`, `CveStatus`, summary types |

Path aliases (`@compass`, `@pages`, `@shared`, `@stores`, `@models`, `@api`, `@data`) are
declared in both `vite.config.ts` and `tsconfig.json`.

## Pages

* **Dashboard** – severity stat cards, remediation progress, most affected components, latest advisories.
* **CVEs** – searchable and sortable advisory table with a resizable detail drawer; `/cves/:cveId` deep links open that drawer.
* **Components** – affected Camel artifacts grouped by category, linking back into a filtered CVE list.
* **Versions** – every scanned tag and branch: kind, name, scan date, vulnerability counts by severity, max risk and max EPSS, read from `public/data/<ref>/vulnerabilities.json`.
* **About** – stack summary and data sources.

## Data

`src/data/*.json` is **sample fixture data** for the scaffold, served through `CveApi`
with a simulated latency. Replacing the bodies of the `CveApi` methods with real HTTP
calls is the only change needed to go live; the pages consume the store, not the API.

`public/data` holds the real scan output produced by `.github/workflows/scan.yml`, one
directory per scanned Camel branch or tag.

### Scan date

The scanner stamps its own date; nothing derives it from CVE fields or commit times.

| File | Contents |
| --- | --- |
| `public/data/<ref>/scan.json` | `{ref, scannedAt, camelCommit, grypeVersion, findings, runUrl}` for that ref |
| `public/data/scan.json` | index: newest `scannedAt` across all refs plus the per-ref list |

`scannedAt` is a UTC ISO 8601 instant taken on the runner right after grype finishes.
`CveApi.getScanInfo()` fetches the index at runtime (not bundled) so a data-only scan
commit updates the displayed date without rebuilding, and the dashboard renders it in
the reader's locale through `@shared/scanDate` (absolute date, relative age, per-ref
tooltip).

## Conventions

* PatternFly components are imported from their individual ESM paths and icons from
  `@patternfly/react-icons/dist/esm/icons/...` to keep chunks small.
* Layout uses PatternFly wrappers (`Page`/`Compass`, `Gallery`, `Grid`, `Flex`) instead of
  ad hoc flex containers; sizing lives in CSS using `--pf-t--global--*` tokens.
* Pages register their header content through `usePageContext` rather than rendering a
  header of their own.