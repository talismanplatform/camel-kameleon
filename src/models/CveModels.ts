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

export const SCAN_SEVERITY_COLOR: Record<ScanSeverity, string> = {
    Critical: 'var(--pf-t--color--red-orange--60)',
    High: 'var(--pf-t--color--orange--50)',
    Medium: 'var(--pf-t--color--yellow--40)',
    Low: 'var(--pf-t--color--gray--50)',
    Negligible: 'grey',
    Unknown: 'grey',
};

/** PatternFly Label colours for the scanner severities. */
export const SCAN_SEVERITY_LABEL_COLOR: Record<ScanSeverity, 'red' | 'orange' | 'yellow' | 'blue' | 'grey'> = {
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

/** Camel's own artifacts all live under this group; anything else is a dependency of Camel. */
export const CAMEL_GROUP_ID = 'org.apache.camel';

/** True for a finding reported against one of Camel's own artifacts rather than a dependency. */
export function isCamelArtifact(vulnerability: Vulnerability): boolean {
    return (vulnerability.groupId ?? '').startsWith(CAMEL_GROUP_ID);
}

/** Severities the scanner does not recognise read as `Unknown`, wherever they are shown. */
export function scanSeverityOf(severity: string): ScanSeverity {
    return SCAN_SEVERITIES.find(known => known.toLowerCase() === severity?.toLowerCase()) ?? 'Unknown';
}

/**
 * One node of a module's dependency tree as the application keeps it: `g`roup,
 * `a`rtifact, `v`ersion and the children it pulls in. `CveApi` compacts the
 * published `mvn-tree.json` into this shape, dropping the maven bookkeeping
 * (type, scope, classifier, optional); the keys are short because a ref carries
 * tens of thousands of these nodes.
 */
export interface DependencyNode {
    g: string;
    a: string;
    v: string;
    children?: DependencyNode[];
}

/** The Camel source trees the scan walks. */
export type ModuleGroup = 'core' | 'components' | 'dsl';

export const MODULE_GROUPS: ModuleGroup[] = ['core', 'components', 'dsl'];

export const MODULE_GROUP_LABEL: Record<ModuleGroup, string> = {
    core: 'Core',
    components: 'Components',
    dsl: 'DSL',
};

/** One dependency tree per Camel module of a ref, by group. */
export type DependencyTrees = Record<ModuleGroup, DependencyNode[]>;

/**
 * One node of `public/data/<ref>/<group>/<module>/mvn-tree.json`, the raw
 * `mvn dependency:tree -DoutputType=json` output the scan publishes per module.
 */
export interface MvnTreeNode {
    groupId: string;
    artifactId: string;
    version: string;
    children?: MvnTreeNode[];
}

/**
 * `public/data/<ref>/modules.json`: the module directories that carry an
 * `mvn-tree.json`, per group and relative to it, e.g.
 * `{"core": ["camel-util"], "components": ["camel-aws/camel-aws2-s3"]}`.
 *
 * A static host answers no directory listing, so the scan writes this index and
 * `CveApi` reads it to know which trees exist.
 */
export type ModuleIndex = Partial<Record<ModuleGroup, string[]>>;

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
    /** `project.version` of the ref, e.g. 4.18.4 or 4.18.5-SNAPSHOT. Absent until scanned. */
    camelVersion?: string;
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

/**
 * One ref of `public/data/versions.json`, paired with the Camel version it builds:
 * a tag names its release, a branch only says so through its `project.version`, so
 * `camelVersion` is filled in by the scan and absent until then.
 */
export interface VersionRef {
    ref: string;
    camelVersion?: string;
}

/** `public/data/versions.json`: the refs the nightly scan walks. */
export interface Versions {
    tags: VersionRef[];
    branches: VersionRef[];
}

/** When a single Camel branch or tag was last scanned. Written by scan.yml. */
export interface RefScan {
    /** Branch or tag of apache/camel that was scanned, e.g. camel-4.22.0 */
    ref: string;
    /** `project.version` the ref builds, e.g. 4.22.0. Absent in hand seeded stamps. */
    camelVersion?: string;
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
