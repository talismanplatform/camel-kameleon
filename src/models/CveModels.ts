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

export interface CamelRelease {
    version: string;
    released: string;
    lts: boolean;
    supported: boolean;
    openCves: number;
    fixedCves: number;
}

export interface CveSummary {
    total: number;
    open: number;
    fixed: number;
    bySeverity: Record<Severity, number>;
    withExploit: number;
    lastScan: string;
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
