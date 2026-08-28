import {DependencyNode, ModuleGroup, SCAN_SEVERITIES, ScanSeverity, Vulnerability} from '@models/CveModels';

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
    /** The Camel source tree the root of this row's subtree was read from, undefined below it. */
    group?: ModuleGroup;
    groupId: string;
    artifactId: string;
    version: string;
    own: FindingSummary;
    transitive: FindingSummary;
    /** The findings of this very coordinate, listed as the last level of the tree. */
    findings: Vulnerability[];
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
 * The rows of one Camel module of `group`: the module itself and, recursively,
 * every dependency it declares. The group is only carried by the root, the rows
 * beneath it are dependencies rather than modules of a Camel source tree.
 *
 * Each row carries the findings of its own coordinate and those of its whole
 * subtree, so a reader sees at which level the problem actually sits.
 *
 * Findings are collected as objects rather than counted on the way up: the same
 * dependency appears in several branches of a module, and a shared library must
 * not be counted once per path that reaches it.
 */
export function componentRows(module: DependencyNode, index: FindingIndex, group: ModuleGroup): ComponentRow {
    return {...walk(module, index, `${group}/${module.a}`).row, group};
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
        findings: own,
        children,
    };
    // The parent's transitive set is everything this subtree carries, its own findings included.
    const all = beneath;
    own.forEach(finding => all.add(finding));
    return {row, all};
}

function emptyCounts(): Record<ScanSeverity, number> {
    return SCAN_SEVERITIES.reduce((acc, severity) => {
        acc[severity] = 0;
        return acc;
    }, {} as Record<ScanSeverity, number>);
}

/** Severities the scanner does not recognise read as `Unknown`. */
export function scanSeverity(severity: string): ScanSeverity {
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

/** Total findings of a row, wherever in its subtree they sit. */
export function total(row: ComponentRow): number {
    return row.own.count + row.transitive.count;
}

/**
 * A row matches a severity filter when the band was reported against its own
 * artifact or anywhere beneath it, which is the same rule the table reads: the
 * row is shown because the problem is either here or under here.
 */
export function hasSeverity(row: ComponentRow, severities: ScanSeverity[]): boolean {
    return severities.some(severity => row.own.bySeverity[severity] > 0 || row.transitive.bySeverity[severity] > 0);
}

/**
 * The findings of one row as the last level of the tree lists them, worst first.
 * The severity filter applies to them the way it applies to a row: a reader who
 * asked for `Critical` is not shown the `Low` findings of a row that matched.
 */
export function rowFindings(row: ComponentRow, severities: ScanSeverity[]): Vulnerability[] {
    const matching = severities.length > 0
        ? row.findings.filter(finding => severities.includes(scanSeverity(finding.severity)))
        : row.findings;
    return [...matching].sort((a, b) =>
        (b.risk ?? MISSING_SCORE) - (a.risk ?? MISSING_SCORE)
        || SCAN_SEVERITIES.indexOf(scanSeverity(a.severity)) - SCAN_SEVERITIES.indexOf(scanSeverity(b.severity))
        || a.vulnerability.localeCompare(b.vulnerability));
}

/**
 * Drops every row the reader did not ask for, at every level. Because a row
 * carries the findings of its whole subtree, a row that fails the test cannot
 * hide a child that would pass it, so a failing row is cut with its subtree.
 */
export function pruneRows(rows: ComponentRow[], keep: (row: ComponentRow) => boolean): ComponentRow[] {
    return rows.flatMap(row => keep(row) ? [{...row, children: pruneRows(row.children, keep)}] : []);
}

/** Columns the tree can be ordered by. The scores are the ones a reader triages on. */
export type ComponentSort = 'name' | 'ownRisk' | 'ownEpss' | 'transitiveRisk' | 'transitiveEpss';

/** Rows without a score sort below any row that has one, in either direction. */
const MISSING_SCORE = -1;

function score(row: ComponentRow, sort: ComponentSort): number {
    switch (sort) {
        case 'ownRisk':
            return row.own.maxRisk ?? MISSING_SCORE;
        case 'ownEpss':
            return row.own.maxEpss ?? MISSING_SCORE;
        case 'transitiveRisk':
            return row.transitive.maxRisk ?? MISSING_SCORE;
        case 'transitiveEpss':
            return row.transitive.maxEpss ?? MISSING_SCORE;
        default:
            return MISSING_SCORE;
    }
}

/** Orders a tree at every level, so an expanded dependency list reads like its parents. */
export function sortRows(rows: ComponentRow[], sort: ComponentSort, direction: 'asc' | 'desc'): ComponentRow[] {
    const factor = direction === 'asc' ? 1 : -1;
    return [...rows]
        .sort((a, b) => (sort === 'name'
            ? a.artifactId.localeCompare(b.artifactId)
            : score(a, sort) - score(b, sort)) * factor)
        .map(row => ({...row, children: sortRows(row.children, sort, direction)}));
}

/** The worst finding of a whole module: the one of its own artifact or of anything it pulls in. */
export interface ModuleScore {
    severity?: ScanSeverity;
    risk?: number;
    epss?: number;
}

const higher = (a: number | undefined, b: number | undefined): number | undefined =>
    a === undefined ? b : b === undefined ? a : Math.max(a, b);

/**
 * Collapses the two halves of a row into one score. The components table keeps
 * `this level` and `dependencies` apart because it says where a fix belongs; a
 * summary only says how bad the module is, wherever the finding sits.
 */
export function moduleScore(row: ComponentRow): ModuleScore {
    return {
        // SCAN_SEVERITIES is ordered worst first, so the first band either half reports is the worst one.
        severity: SCAN_SEVERITIES.find(severity => severity === row.own.maxSeverity || severity === row.transitive.maxSeverity),
        risk: higher(row.own.maxRisk, row.transitive.maxRisk),
        epss: higher(row.own.maxEpss, row.transitive.maxEpss),
    };
}

/**
 * The modules a reader triages first: worst risk anywhere in their tree, EPSS
 * breaking ties, name last so the order does not move between renders. Modules
 * without findings are left out, they say nothing on a summary.
 */
export function topModules(rows: ComponentRow[], limit: number): {row: ComponentRow; score: ModuleScore}[] {
    return rows
        .filter(row => total(row) > 0)
        .map(row => ({row, score: moduleScore(row)}))
        .sort((a, b) => (b.score.risk ?? MISSING_SCORE) - (a.score.risk ?? MISSING_SCORE)
            || (b.score.epss ?? MISSING_SCORE) - (a.score.epss ?? MISSING_SCORE)
            || a.row.artifactId.localeCompare(b.row.artifactId))
        .slice(0, limit);
}
