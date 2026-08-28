import {DependencyNode, SCAN_SEVERITIES, ScanSeverity, Vulnerability} from '@models/CveModels';

/**
 * The findings of one node of a dependency tree, aggregated: how many there are,
 * how they break down by severity and the worst score of the set. Rendered twice
 * per row, once for the artifact itself and once for everything it pulls in.
 */
export interface FindingSummary {
    count: number;
    bySeverity: Record<ScanSeverity, number>;
    /** Worst severity of the set, undefined when it is empty. */
    maxSeverity?: ScanSeverity;
    maxRisk?: number;
    maxEpss?: number;
}

export const NO_FINDINGS: FindingSummary = {count: 0, bySeverity: emptyCounts()};

/**
 * One row of the components tree table: a Camel module at the root, a dependency
 * below it, with its findings split into the ones reported against the artifact
 * of this very row (`own`) and the ones reported anywhere beneath it
 * (`transitive`). The split is the point of the table: it says whether the issue
 * has to be fixed here or in something this row depends on.
 */
export interface ComponentRow {
    /** Stable across renders, and unique even where the same artifact appears twice. */
    key: string;
    groupId: string;
    artifactId: string;
    version: string;
    own: FindingSummary;
    transitive: FindingSummary;
    children: ComponentRow[];
}

/** Findings of a ref by `groupId:artifactId:version`, the coordinate they were reported against. */
export type FindingIndex = Map<string, Vulnerability[]>;

const coordinateKey = (groupId: string, artifactId: string, version: string) => `${groupId}:${artifactId}:${version}`;

/**
 * Indexes a report by coordinate so a tree of tens of thousands of nodes is
 * matched by lookup rather than by scanning the report per node. Findings
 * without maven coordinates cannot be placed in a tree and are left out.
 */
export function findingIndex(vulnerabilities: Vulnerability[]): FindingIndex {
    const index: FindingIndex = new Map();
    vulnerabilities.forEach(vulnerability => {
        const {groupId, artifactId, installed} = vulnerability;
        if (!groupId || !artifactId) {
            return;
        }
        const key = coordinateKey(groupId, artifactId, installed);
        const findings = index.get(key);
        if (findings) {
            findings.push(vulnerability);
        } else {
            index.set(key, [vulnerability]);
        }
    });
    return index;
}

/**
 * The rows of one Camel module: the module itself and, recursively, every
 * dependency it declares. Each row carries the findings of its own coordinate
 * and those of its whole subtree, so a reader sees at which level the problem
 * actually sits.
 *
 * Findings are collected as objects rather than counted on the way up: the same
 * dependency appears in several branches of a module, and a shared library must
 * not be counted once per path that reaches it.
 */
export function componentRows(module: DependencyNode, index: FindingIndex): ComponentRow {
    return walk(module, index, module.a).row;
}

function walk(node: DependencyNode, index: FindingIndex, path: string): {row: ComponentRow; all: Set<Vulnerability>} {
    const own = index.get(coordinateKey(node.g, node.a, node.v)) ?? [];
    const children: ComponentRow[] = [];
    const beneath = new Set<Vulnerability>();
    (node.children ?? []).forEach((child, position) => {
        const walked = walk(child, index, `${path}/${position}:${child.g}:${child.a}:${child.v}`);
        children.push(walked.row);
        walked.all.forEach(finding => beneath.add(finding));
    });
    const row: ComponentRow = {
        key: path,
        groupId: node.g,
        artifactId: node.a,
        version: node.v,
        own: summarize(own),
        transitive: summarize(beneath),
        children,
    };
    // The parent's transitive set is everything this subtree carries, its own findings included.
    const all = beneath;
    own.forEach(finding => all.add(finding));
    return {row, all};
}

/** Total findings of a row, wherever in its subtree they sit. */
export function total(row: ComponentRow): number {
    return row.own.count + row.transitive.count;
}

function emptyCounts(): Record<ScanSeverity, number> {
    return SCAN_SEVERITIES.reduce((acc, severity) => {
        acc[severity] = 0;
        return acc;
    }, {} as Record<ScanSeverity, number>);
}

/** Severities the scanner does not recognise read as `Unknown`. */
function scanSeverity(severity: string): ScanSeverity {
    return SCAN_SEVERITIES.find(known => known.toLowerCase() === severity?.toLowerCase()) ?? 'Unknown';
}

function summarize(findings: Iterable<Vulnerability>): FindingSummary {
    const bySeverity = emptyCounts();
    let count = 0;
    let maxRisk: number | undefined;
    let maxEpss: number | undefined;
    for (const finding of findings) {
        count += 1;
        bySeverity[scanSeverity(finding.severity)] += 1;
        if (typeof finding.risk === 'number' && (maxRisk === undefined || finding.risk > maxRisk)) {
            maxRisk = finding.risk;
        }
        if (typeof finding.epss === 'number' && (maxEpss === undefined || finding.epss > maxEpss)) {
            maxEpss = finding.epss;
        }
    }
    if (count === 0) {
        return NO_FINDINGS;
    }
    return {
        count,
        bySeverity,
        // SCAN_SEVERITIES is ordered worst first, so the first non empty band is the worst one.
        maxSeverity: SCAN_SEVERITIES.find(severity => bySeverity[severity] > 0),
        maxRisk,
        maxEpss,
    };
}
