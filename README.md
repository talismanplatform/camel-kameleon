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
| `src/api/DataSource.ts` | Resolves the base URL the scan data is fetched from |
| `src/data` | Sample advisory fixtures |
| `src/models/CveModels.ts` | `Cve`, `Severity`, `CveStatus`, summary types |

Path aliases (`@compass`, `@pages`, `@shared`, `@stores`, `@models`, `@api`, `@data`) are
declared in both `vite.config.ts` and `tsconfig.json`.

## Pages

* **Dashboard** – severity stat cards, remediation progress, most affected components, latest advisories.
* **CVEs** – searchable and sortable advisory table with a resizable detail drawer; `/cves/:cveId` deep links open that drawer.
* **Components** – tree table of every Camel component of the selected version and, level by level,
  the dependencies it pulls in; each level scores its own findings and those of its dependencies
  separately (severity, risk, EPSS) so it is clear whether the issue sits in the component or below it.
* **Versions** – every scanned tag and branch: kind, name, scan date, vulnerability counts by severity, max risk and max EPSS, read from `public/data/<ref>/vulnerabilities.json`.
* **About** – how the dashboard works: the nightly scan pipeline, how the browser reads the published data, what each page shows, how severity/EPSS/risk are meant to be read, plus the current data set (refs, findings, scanner, last run).

## Data

`src/data/*.json` is **sample fixture data** for the scaffold, served through `CveApi`
with a simulated latency. Replacing the bodies of the `CveApi` methods with real HTTP
calls is the only change needed to go live; the pages consume the store, not the API.

`public/data` holds the real scan output produced by `.github/workflows/scan.yml`, one
directory per scanned Camel branch or tag.

### Where the data is read from

The scan workflow commits data every night and, by design, does not deploy. Nothing is
bundled and the build does not even copy `public/data` into `dist`, so the deployment can
never serve a stale snapshot: `src/api/DataSource.ts` resolves the data directory at
runtime and every fetch goes through it.

| Where it runs | Data base URL |
| --- | --- |
| `npm run dev` | `${BASE_URL}data/` – the dev server serves the working copy |
| GitHub Pages (`<owner>.github.io/<repo>/`) | `https://raw.githubusercontent.com/<owner>/<repo>/HEAD/public/data/` |
| anywhere else | `VITE_DATA_BASE_URL`, else `${BASE_URL}data/` |

Owner and repository come from the location, not from configuration, so a fork's Pages
site reads the fork's own data. `HEAD` is the default branch, and raw
answers with `Access-Control-Allow-Origin: *`, so a data-only commit is live within
the five minutes raw caches for – no redeploy.

Other hosts (a custom domain, or `vite preview`, whose `dist` carries no data) name the
directory themselves at build time:

```bash
VITE_DATA_BASE_URL=https://raw.githubusercontent.com/talismanplatform/camel-kameleon/HEAD/public/data npm run build
```

### Dependency trees

The scan keeps the `mvn dependency:tree` output of every Camel module as
`public/data/<ref>/<group>/<module>/mvn-tree.json` and, because a static host answers no
directory listing, indexes those paths in `public/data/<ref>/modules.json`.

Nothing folds them at build time: `CveApi.getDependencyTrees(ref)` reads the index,
fetches the module trees from the server in parallel (a bounded number of requests at a
time), compacts them to bare coordinates in the browser and memoises the result per ref.
A data-only scan commit therefore updates the trees on GitHub Pages with no rebuild and
no generated artifact to keep in sync.

The vulnerability drawer asks for them the first time it is opened and shows the `core`,
`components` and `dsl` modules whose tree reaches the reported artifact, pruned to the
branches that end in it.

The components page reads the same trees: it walks the `components` group recursively into
a tree table and, for every level, folds the report into the findings of that artifact and
the findings of its subtree.

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