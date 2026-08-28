import React, {useEffect, useMemo, useState} from 'react';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import {EmptyState, EmptyStateBody} from '@patternfly/react-core/dist/esm/components/EmptyState';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Table, Tbody, Td, Th, Thead, Tr, TreeRowWrapper} from '@patternfly/react-table';
import CubesIcon from '@patternfly/react-icons/dist/esm/icons/cubes-icon';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import {DependencyNode, DependencyTrees, MODULE_GROUP_LABEL, MODULE_GROUPS, Vulnerability} from '@models/CveModels';
import {useCveStore} from '@stores/useCveStore';

/** A node of the pruned tree: every branch ends in the vulnerable dependency. */
interface TreeRow {
    key: string;
    /** `groupId:artifactId` of a dependency, or the group name on a heading row. */
    label: string;
    version?: string;
    isVulnerable: boolean;
    children: TreeRow[];
}

/**
 * Matches the reported artifact: `groupId:artifactId` at the installed version.
 * A finding without maven coordinates cannot be placed in a tree, so it matches
 * nothing rather than every node that happens to share the scanner's name.
 */
function matcher(vulnerability: Vulnerability): (node: DependencyNode) => boolean {
    const {groupId, artifactId, installed} = vulnerability;
    if (!groupId || !artifactId) {
        return () => false;
    }
    return node => node.g === groupId && node.a === artifactId && node.v === installed;
}

/**
 * The branches of one module tree that end in the vulnerable dependency, or
 * undefined when it does not appear in this module at all. A match is a leaf:
 * what it drags in itself is another finding's business.
 */
function prune(node: DependencyNode, matches: (node: DependencyNode) => boolean, path: string): TreeRow | undefined {
    const key = `${path}/${node.g}:${node.a}:${node.v}`;
    const row = {key, label: `${node.g}:${node.a}`, version: node.v};
    if (matches(node)) {
        return {...row, isVulnerable: true, children: []};
    }
    const children = (node.children ?? [])
        .map((child, index) => prune(child, matches, `${key}[${index}]`))
        .filter((child): child is TreeRow => child !== undefined);
    return children.length > 0 ? {...row, isVulnerable: false, children} : undefined;
}

/** One heading row per group, holding the modules that reach the dependency. */
function affectedModules(trees: DependencyTrees, matches: (node: DependencyNode) => boolean): TreeRow[] {
    return MODULE_GROUPS.flatMap(group => {
        const modules = (trees[group] ?? [])
            .map((tree, index) => prune(tree, matches, `${group}[${index}]`))
            .filter((module): module is TreeRow => module !== undefined);
        return modules.length > 0
            ? [{key: group, label: MODULE_GROUP_LABEL[group], isVulnerable: false, children: modules}]
            : [];
    });
}

/** Modules whose branch ends in a matching leaf, counted once per module. */
function moduleCount(rows: TreeRow[]): number {
    return rows.reduce((count, group) => count + group.children.length, 0);
}

interface DependencyTreeProps {
    vulnerability: Vulnerability;
}

/**
 * Where the finding enters Camel: the `core`, `components` and `dsl` modules of
 * the selected ref whose dependency tree reaches the vulnerable artifact at the
 * installed version, with the path that pulls it in. Branches that end anywhere
 * else, another artifact or another version, are pruned away.
 */
export const DependencyTree: React.FunctionComponent<DependencyTreeProps> = ({vulnerability}) => {

    const selectedRef = useCveStore((s) => s.selectedRef);
    const trees = useCveStore((s) => s.dependencyTrees);
    const loading = useCveStore((s) => s.dependencyTreesLoading);
    const loadDependencyTrees = useCveStore((s) => s.loadDependencyTrees);

    // Collapsed rather than expanded: a pruned tree is short and reads best open.
    const [collapsed, setCollapsed] = useState<string[]>([]);

    useEffect(() => {
        loadDependencyTrees();
    }, [selectedRef]);

    useEffect(() => setCollapsed([]), [vulnerability, trees]);

    /**
     * The installed version only. Camel pins a dependency per module, so a
     * finding on 42.7.9 says nothing about a module already on a fixed
     * 42.7.10; those branches are not this finding and stay out of the tree.
     */
    const rows = useMemo(
        () => trees ? affectedModules(trees, matcher(vulnerability)) : [],
        [trees, vulnerability]);

    if (loading) {
        return <Bullseye><Spinner size="lg" aria-label="Loading dependency trees"/></Bullseye>;
    }

    if (rows.length === 0) {
        return (
            <EmptyState headingLevel="h3" titleText="Not a runtime dependency" icon={CubesIcon} variant="xs">
                <EmptyStateBody>
                    {trees
                        ? `No core, components or dsl module of ${selectedRef} depends on ${coordinates(vulnerability)}.`
                        : `No dependency trees have been published for ${selectedRef}.`}
                </EmptyStateBody>
            </EmptyState>
        );
    }

    const toggle = (key: string) =>
        setCollapsed(keys => keys.includes(key) ? keys.filter(other => other !== key) : [...keys, key]);

    const renderRows = (treeRows: TreeRow[], level: number, isHidden: boolean, index: {row: number}): React.ReactNode[] =>
        treeRows.flatMap((row, position) => {
            const isExpanded = !collapsed.includes(row.key);
            const props = {
                isExpanded,
                isHidden,
                'aria-level': level,
                'aria-posinset': position + 1,
                'aria-setsize': row.children.length,
                icon: row.isVulnerable ? <ExclamationCircleIcon className="cve-tree-hit"/> : undefined,
            };
            const rowIndex = index.row++;
            return [
                <TreeRowWrapper key={row.key} row={{props}}>
                    <Td dataLabel="Dependency" treeRow={{onCollapse: () => toggle(row.key), rowIndex, props}}>
                        {row.label}
                    </Td>
                    <Td dataLabel="Version" modifier="nowrap">{row.version}</Td>
                </TreeRowWrapper>,
                ...renderRows(row.children, level + 1, isHidden || !isExpanded, index),
            ];
        });

    return (
        <div className="cve-dependency-tree">
            <Title headingLevel="h3" size="md">
                {`Affected modules (${moduleCount(rows)})`}
            </Title>
            <Table aria-label={`Modules depending on ${coordinates(vulnerability)}`} variant="compact" isTreeTable>
                <Thead>
                    <Tr>
                        <Th>Dependency</Th>
                        <Th modifier="fitContent">Version</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {renderRows(rows, 1, false, {row: 0})}
                </Tbody>
            </Table>
        </div>
    );
};

/** `group:artifact:version` of the finding, falling back to the scanner's package name. */
function coordinates(vulnerability: Vulnerability): string {
    const {groupId, artifactId, name, installed} = vulnerability;
    return groupId && artifactId ? `${groupId}:${artifactId}:${installed}` : `${name} ${installed}`;
}
