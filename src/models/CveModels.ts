export type Severity = 'critical' | 'important' | 'moderate' | 'low';

export type CveStatus = 'affected' | 'fixed' | 'under-investigation' | 'not-affected';

export interface Cve {
    cveId: string;
    title: string;
    description: string;
    severity: Severity;
    cvssScore: number;
    cvssVector: string;
    cwe: string;
    published: string;
    updated: string;
    status: CveStatus;
    /** Camel artifacts impacted by this CVE, e.g. camel-http */
    components: string[];
    affectedVersions: string[];
    fixedIn: string[];
    references: string[];
    exploitAvailable: boolean;
}

export interface CamelComponent {
    name: string;
    artifactId: string;
    category: string;
    cveCount: number;
    highestSeverity: Severity | 'none';
}

export interface CveSummary {
    total: number;
    open: number;
    fixed: number;
    bySeverity: Record<Severity, number>;
    withExploit: number;
}

/** Grype severity, as written into `vulnerabilities.json` by the scanner. */
export type ScanSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Negligible' | 'Unknown';

export const SCAN_SEVERITIES: ScanSeverity[] = ['Critical', 'High', 'Medium', 'Low', 'Negligible', 'Unknown'];

export const SCAN_SEVERITY_COLOR: Record<ScanSeverity, 'red' | 'orange' | 'yellow' | 'blue' | 'grey'> = {
    Critical: 'red',
    High: 'orange',
    Medium: 'yellow',
    Low: 'blue',
    Negligible: 'grey',
    Unknown: 'grey',
};

/** One row of `public/data/<ref>/vulnerabilities.json`. */
export interface Vulnerability {
    /** Dependency the finding was reported against, e.g. snakeyaml */
    name: string;
    installed: string;
    /** Fixed version, or `(not-fixed)` / `(unknown)` when there is none. */
    fixed_in: string;
    type: string;
    groupId?: string;
    artifactId?: string;
    /** Advisory id, e.g. GHSA-mjmj-j48q-9wg2 or CVE-2022-1471 */
    vulnerability: string;
    severity: string;
    dataSource: string;
    description: string;
    /** Exploit Prediction Scoring System probability, 0..1. Null when unknown. */
    epss: number | null;
    /** Grype risk score. Null when unknown. */
    risk: number | null;
}

/** One entry of `public/data/camel_versions.json`, as written by `camel version list --json`. */
export interface CamelVersion {
    /** Release version without the `camel-` prefix, e.g. 4.22.0 */
    camelVersion: string;
    runtime: string;
    /** Supported JDKs, comma separated, e.g. `17,21,25` */
    jdkVersion?: string;
    /** `lts` on long term support releases, absent otherwise. */
    kind?: string;
    releaseDate?: string;
    /** Only LTS releases carry an end of life date. */
    eolDate?: string;
}

/** A scanned ref of apache/camel: what it is, when it was scanned and how bad it is. */
export interface VersionScan {
    /** Branch or tag name, e.g. camel-4.22.0 */
    ref: string;
    kind: 'tag' | 'branch';
    /** UTC ISO 8601 instant of the last scan, absent when never scanned. */
    scannedAt?: string;
    /** Total findings in `vulnerabilities.json`. */
    total: number;
    bySeverity: Record<ScanSeverity, number>;
    /** Highest risk / EPSS across the findings, undefined when there are none. */
    maxRisk?: number;
    maxEpss?: number;
    /** False when the report could not be loaded, so counts read as unknown. */
    loaded: boolean;
    /** Release metadata from `camel_versions.json`, absent for refs it does not know. */
    release?: CamelVersion;
}

/** `public/data/versions.json`: the refs the nightly scan walks. */
export interface Versions {
    tags: string[];
    branches: string[];
}

/** When a single Camel branch or tag was last scanned. Written by scan.yml. */
export interface RefScan {
    /** Branch or tag of apache/camel that was scanned, e.g. camel-4.22.0 */
    ref: string;
    /** UTC ISO 8601 instant the scanner produced the report. */
    scannedAt: string;
    /** Optional provenance, absent in hand seeded stamps. */
    camelCommit?: string;
    grypeVersion?: string;
    findings?: number;
    runUrl?: string;
}

/** `public/data/scan.json`: newest scan date plus the per-ref breakdown. */
export interface ScanInfo {
    /** Newest `scannedAt` across every scanned ref. */
    scannedAt: string;
    refs: RefScan[];
}

export const SEVERITIES: Severity[] = ['critical', 'important', 'moderate', 'low'];

export const SEVERITY_LABEL: Record<Severity, string> = {
    critical: 'Critical',
    important: 'Important',
    moderate: 'Moderate',
    low: 'Low',
};

/** PatternFly Label colours, kept in one place so severity always reads the same way. */
export const SEVERITY_COLOR: Record<Severity, 'red' | 'orange' | 'yellow' | 'blue'> = {
    critical: 'red',
    important: 'orange',
    moderate: 'yellow',
    low: 'blue',
};

export const STATUS_LABEL: Record<CveStatus, string> = {
    'affected': 'Affected',
    'fixed': 'Fixed',
    'under-investigation': 'Under investigation',
    'not-affected': 'Not affected',
};

export function isOpen(cve: Cve): boolean {
    return cve.status === 'affected' || cve.status === 'under-investigation';
}
