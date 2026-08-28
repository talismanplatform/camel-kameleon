import cvesJson from '@data/cves.json';
import {
    CamelComponent,
    CamelVersion,
    Cve,
    isCamelArtifact,
    DependencyNode,
    DependencyTrees,
    CveSummary,
    isOpen,
    ModuleIndex,
    MODULE_GROUPS,
    ModuleGroup,
    MvnTreeNode,
    ScanInfo,
    SCAN_SEVERITIES,
    ScanSeverity,
    scanSeverityOf,
    SEVERITIES,
    Severity,
    VersionRef,
    VersionScan,
    Versions,
    Vulnerability,
} from '@models/CveModels';

/**
 * Fixture backed API. Every method mirrors the shape of the REST endpoint that will
 * replace it, so only the body of these functions changes once a backend exists.
 */
const LATENCY_MS = 250;

/**
 * Scan data lives under `public/data` and is refreshed by the nightly workflow, so
 * it is fetched at runtime rather than bundled: a data-only commit updates the
 * dashboard without rebuilding the application.
 *
 * `BASE_URL` is `/` on localhost and `/camel-kameleon/` in the GitHub Pages build,
 * so prefixing it makes one relative `data/...` path work in both places.
 */
const dataUrl = (path: string) => `${import.meta.env.BASE_URL}data/${path}`;

const SCAN_INFO_URL = dataUrl('scan.json');

const VERSIONS_URL = dataUrl('versions.json');

const CAMEL_VERSIONS_URL = dataUrl('camel_versions.json');

const vulnerabilitiesUrl = (ref: string) => dataUrl(`${encodeURIComponent(ref)}/vulnerabilities.json`);

const moduleIndexUrl = (ref: string) => dataUrl(`${encodeURIComponent(ref)}/modules.json`);

/** `path` is a module directory relative to its group, so its segments are encoded one by one. */
const moduleTreeUrl = (ref: string, group: ModuleGroup, path: string) =>
    dataUrl(`${encodeURIComponent(ref)}/${group}/${path.split('/').map(encodeURIComponent).join('/')}/mvn-tree.json`);

/**
 * One `vulnerabilities.json` per ref per session: the version table, the CVE page
 * and the dashboard counts all read the same reports, and the dashboard needs every
 * ref at once. Undefined is cached too, so a missing report stays distinguishable
 * from an empty one.
 */
const reports = new Map<string, Promise<Vulnerability[] | undefined>>();

function report(ref: string): Promise<Vulnerability[] | undefined> {
    const cached = reports.get(ref);
    if (cached) {
        return cached;
    }
    const pending = fetchJson<Vulnerability[]>(vulnerabilitiesUrl(ref)).catch(() => undefined);
    reports.set(ref, pending);
    return pending;
}

/** Trees are assembled from a few hundred files, so a ref is folded once per session. */
const dependencyTrees = new Map<string, DependencyTrees>();

/** Module trees fetched at once: enough to keep the connection busy without flooding the host. */
const MODULE_REQUESTS = 12;

const CVES = cvesJson as Cve[];

/** Category is derived from the artifact name until the backend supplies it. */
function categoryOf(artifactId: string): string {
    if (artifactId === 'camel-core') {
        return 'Core';
    }
    if (/http|jetty|undertow|netty|servlet|platform-http/.test(artifactId)) {
        return 'HTTP';
    }
    if (/sql|jdbc|mongo|jpa/.test(artifactId)) {
        return 'Data';
    }
    if (/kafka|jms|amqp|avro/.test(artifactId)) {
        return 'Messaging';
    }
    if (/xml|xslt|zipfile|compress|attachments|file/.test(artifactId)) {
        return 'Transformation';
    }
    return 'Other';
}

function highestSeverity(cves: Cve[]): Severity | 'none' {
    return SEVERITIES.find(severity => cves.some(cve => cve.severity === severity)) ?? 'none';
}

function delayed<T>(value: T): Promise<T> {
    return new Promise(resolve => setTimeout(() => resolve(value), LATENCY_MS));
}

export const CveApi = {

    getCves(): Promise<Cve[]> {
        return delayed(CVES);
    },

    getSummary(): Promise<CveSummary> {
        const bySeverity = SEVERITIES.reduce((acc, severity) => {
            acc[severity] = CVES.filter(cve => cve.severity === severity).length;
            return acc;
        }, {} as Record<Severity, number>);

        const open = CVES.filter(isOpen).length;

        return delayed({
            total: CVES.length,
            open,
            fixed: CVES.length - open,
            bySeverity,
            withExploit: CVES.filter(cve => cve.exploitAvailable).length,
        });
    },

    /** Resolves to undefined when no scan has been published yet. */
    getScanInfo(): Promise<ScanInfo | undefined> {
        return fetchJson<ScanInfo>(SCAN_INFO_URL);
    },

    getComponents(): Promise<CamelComponent[]> {
        const artifacts = [...new Set(CVES.flatMap(cve => cve.components))].sort();
        return delayed(artifacts.map(artifactId => {
            const affecting = CVES.filter(cve => cve.components.includes(artifactId));
            return {
                name: artifactId.replace(/^camel-/, ''),
                artifactId,
                category: categoryOf(artifactId),
                cveCount: affecting.length,
                highestSeverity: highestSeverity(affecting),
            };
        }));
    },

    /** Findings of one scanned ref. Empty when the report is missing. */
    async getVulnerabilities(ref: string): Promise<Vulnerability[]> {
        return await report(ref) ?? [];
    },

    /**
     * Advisories against Camel's own artifacts, counted per scanner severity over
     * every scanned ref. Findings against dependencies are left out, and an
     * advisory hitting several modules or several refs counts once, at the worst
     * severity it was reported with.
     */
    async getCamelSeverityCounts(): Promise<Record<ScanSeverity, number>> {
        const versions = await fetchJson<Versions>(VERSIONS_URL).catch(() => undefined);
        const refs = [...refsOf(versions?.tags), ...refsOf(versions?.branches)];
        const findings = (await Promise.all(refs.map(({ref}) => report(ref))))
            .flatMap(refReport => refReport ?? []);
        const worst = new Map<string, ScanSeverity>();
        for (const vulnerability of findings.filter(isCamelArtifact)) {
            const severity = scanSeverityOf(vulnerability.severity);
            const kept = worst.get(vulnerability.vulnerability);
            if (!kept || SCAN_SEVERITIES.indexOf(severity) < SCAN_SEVERITIES.indexOf(kept)) {
                worst.set(vulnerability.vulnerability, severity);
            }
        }
        return [...worst.values()].reduce((counts, severity) => {
            counts[severity] += 1;
            return counts;
        }, EMPTY_COUNTS());
    },

    /**
     * The dependency trees of every Camel module of one ref, read straight from
     * the `mvn-tree.json` files the scan publishes: `modules.json` says which
     * modules exist, their trees are fetched in parallel and compacted to bare
     * coordinates here in the browser. Nothing is precomputed at build time, so
     * a data-only scan commit is all a static host needs.
     *
     * Undefined when the ref publishes no module index, which is the case for
     * refs scanned before the trees existed. Modules whose own tree is missing
     * or unreadable are skipped rather than failing the whole ref.
     */
    async getDependencyTrees(ref: string): Promise<DependencyTrees | undefined> {
        const folded = dependencyTrees.get(ref);
        if (folded) {
            return folded;
        }
        const index = await fetchJson<ModuleIndex>(moduleIndexUrl(ref)).catch(() => undefined);
        if (!index) {
            return undefined;
        }
        // One queue across all groups keeps the burst on the host bounded.
        const modules = MODULE_GROUPS.flatMap(group => (index[group] ?? []).map(path => ({group, path})));
        const trees = await mapLimit(modules, MODULE_REQUESTS, async ({group, path}) => ({
            group,
            tree: await fetchJson<MvnTreeNode>(moduleTreeUrl(ref, group, path)).catch(() => undefined),
        }));
        // A module that depends on nothing, or whose tree is missing, says nothing about a vulnerability.
        const loaded = trees.filter((module): module is {group: ModuleGroup, tree: MvnTreeNode} =>
            (module.tree?.children?.length ?? 0) > 0);
        const forest = Object.fromEntries(MODULE_GROUPS.map(group => [
            group,
            loaded.filter(module => module.group === group).map(module => compact(module.tree)),
        ])) as DependencyTrees;
        dependencyTrees.set(ref, forest);
        return forest;
    },

    /**
     * One row per scanned ref: `versions.json` says which refs exist and whether
     * each is a tag or a branch, `scan.json` when it was scanned, the ref's own
     * `vulnerabilities.json` supplies the severity counts, max risk and max
     * EPSS, and `camel_versions.json` adds the release metadata (LTS, JDKs,
     * release and EOL dates). Reports are fetched in parallel and a missing one
     * only degrades its own row.
     */
    async getVersions(): Promise<VersionScan[]> {
        const [versions, scanInfo, camelVersions] = await Promise.all([
            fetchJson<Versions>(VERSIONS_URL),
            fetchJson<ScanInfo>(SCAN_INFO_URL).catch(() => undefined),
            fetchJson<CamelVersion[]>(CAMEL_VERSIONS_URL).catch(() => undefined),
        ]);

        const refs = [
            ...refsOf(versions?.tags).map(entry => ({...entry, kind: 'tag' as const})),
            ...refsOf(versions?.branches).map(entry => ({...entry, kind: 'branch' as const})),
        ];

        return Promise.all(refs.map(async ({ref, camelVersion, kind}) => {
            const vulnerabilities = await report(ref);
            const scan = scanInfo?.refs?.find(candidate => candidate.ref === ref);
            // The stamp of the last scan knows the version that was actually built,
            // versions.json only what was expected of the ref before it was cloned.
            const version = scan?.camelVersion ?? camelVersion;
            return {
                ref,
                kind,
                camelVersion: version,
                scannedAt: scan?.scannedAt,
                release: releaseOf(ref, version, camelVersions),
                ...aggregate(vulnerabilities),
            };
        }));
    },
};

/**
 * Release metadata for a scanned ref. A ref that builds a released version matches
 * it outright; otherwise a tag maps onto a release once the `camel-` prefix is
 * dropped, and a maintenance branch such as `camel-4.22.x`, which builds a snapshot
 * of the next patch, takes the newest release of its series. `main` has not been
 * released, so it has no entry.
 */
function releaseOf(ref: string, camelVersion?: string, camelVersions?: CamelVersion[]): CamelVersion | undefined {
    if (!camelVersions) {
        return undefined;
    }
    const released = camelVersions.find(candidate => candidate.camelVersion === camelVersion);
    if (released) {
        return released;
    }
    const version = ref.replace(/^camel-/, '');
    if (version.endsWith('.x')) {
        const series = version.slice(0, -1);
        return camelVersions
            .filter(candidate => candidate.camelVersion.startsWith(series))
            .sort((a, b) => compareVersions(a.camelVersion, b.camelVersion))
            .pop();
    }
    return camelVersions.find(candidate => candidate.camelVersion === version);
}

/**
 * The refs of one `versions.json` list, tolerating the older shape that held bare
 * ref names, so a deployed dashboard still reads data written before this change.
 */
function refsOf(entries?: (VersionRef | string)[]): VersionRef[] {
    return (entries ?? []).map(entry => typeof entry === 'string' ? {ref: entry} : entry);
}

/** Numeric, segment by segment, so 4.22.10 sorts after 4.22.9. */
export function compareVersions(a: string, b: string): number {
    const left = a.split('.').map(Number);
    const right = b.split('.').map(Number);
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
        const diff = (left[i] ?? 0) - (right[i] ?? 0);
        if (diff !== 0) {
            return diff;
        }
    }
    return 0;
}

/** Coordinates only, and `children` only where there are any. */
function compact(node: MvnTreeNode): DependencyNode {
    const children = (node.children ?? []).map(compact);
    const coordinates = {g: node.groupId, a: node.artifactId, v: node.version};
    return children.length > 0 ? {...coordinates, children} : coordinates;
}

/** `Promise.all` over `items` with at most `limit` of them outstanding, order preserved. */
async function mapLimit<T, R>(items: T[], limit: number, map: (item: T) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await map(items[index]);
        }
    };
    await Promise.all(Array.from({length: Math.min(limit, items.length)}, worker));
    return results;
}

/** Resolves to undefined for any response that is not a readable JSON body. */
async function fetchJson<T>(url: string): Promise<T | undefined> {
    const response = await fetch(url, {cache: 'no-cache'});
    if (!response.ok) {
        return undefined;
    }
    return await response.json() as T;
}

const EMPTY_COUNTS = () => SCAN_SEVERITIES.reduce((acc, severity) => {
    acc[severity] = 0;
    return acc;
}, {} as Record<ScanSeverity, number>);

function aggregate(vulnerabilities?: Vulnerability[]): Pick<VersionScan, 'total' | 'bySeverity' | 'maxRisk' | 'maxEpss' | 'loaded'> {
    if (!vulnerabilities) {
        return {total: 0, bySeverity: EMPTY_COUNTS(), loaded: false};
    }
    const bySeverity = vulnerabilities.reduce((acc, vulnerability) => {
        acc[scanSeverityOf(vulnerability.severity)] += 1;
        return acc;
    }, EMPTY_COUNTS());
    return {
        total: vulnerabilities.length,
        bySeverity,
        maxRisk: max(vulnerabilities.map(vulnerability => vulnerability.risk)),
        maxEpss: max(vulnerabilities.map(vulnerability => vulnerability.epss)),
        loaded: true,
    };
}

/** Undefined rather than -Infinity when nothing carries a score. */
function max(values: (number | null | undefined)[]): number | undefined {
    const numbers = values.filter((value): value is number => typeof value === 'number');
    return numbers.length > 0 ? Math.max(...numbers) : undefined;
}
