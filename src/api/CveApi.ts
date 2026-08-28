import cvesJson from '@data/cves.json';
import {
    CamelComponent,
    CamelVersion,
    Cve,
    CveSummary,
    isOpen,
    ScanInfo,
    SCAN_SEVERITIES,
    ScanSeverity,
    SEVERITIES,
    Severity,
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
        return await fetchJson<Vulnerability[]>(vulnerabilitiesUrl(ref)).catch(() => undefined) ?? [];
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

        const refs: { ref: string, kind: 'tag' | 'branch' }[] = [
            ...(versions?.tags ?? []).map(ref => ({ref, kind: 'tag' as const})),
            ...(versions?.branches ?? []).map(ref => ({ref, kind: 'branch' as const})),
        ];

        return Promise.all(refs.map(async ({ref, kind}) => {
            const vulnerabilities = await fetchJson<Vulnerability[]>(vulnerabilitiesUrl(ref)).catch(() => undefined);
            return {
                ref,
                kind,
                scannedAt: scanInfo?.refs?.find(scan => scan.ref === ref)?.scannedAt,
                release: releaseOf(ref, camelVersions),
                ...aggregate(vulnerabilities),
            };
        }));
    },
};

/**
 * Release metadata for a scanned ref. Tags map straight onto a release once the
 * `camel-` prefix is dropped, while a maintenance branch such as `camel-4.22.x`
 * takes the newest release of its series. `main` has not been released, so it
 * has no entry.
 */
function releaseOf(ref: string, camelVersions?: CamelVersion[]): CamelVersion | undefined {
    if (!camelVersions) {
        return undefined;
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

/** Severities the scanner does not recognise are counted as `Unknown`. */
function scanSeverity(severity: string): ScanSeverity {
    return SCAN_SEVERITIES.find(known => known.toLowerCase() === severity?.toLowerCase()) ?? 'Unknown';
}

function aggregate(vulnerabilities?: Vulnerability[]): Pick<VersionScan, 'total' | 'bySeverity' | 'maxRisk' | 'maxEpss' | 'loaded'> {
    if (!vulnerabilities) {
        return {total: 0, bySeverity: EMPTY_COUNTS(), loaded: false};
    }
    const bySeverity = vulnerabilities.reduce((acc, vulnerability) => {
        acc[scanSeverity(vulnerability.severity)] += 1;
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
