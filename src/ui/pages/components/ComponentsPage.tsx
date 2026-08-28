import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Badge} from '@patternfly/react-core/dist/esm/components/Badge';
import {EmptyState, EmptyStateBody} from '@patternfly/react-core/dist/esm/components/EmptyState';
import {MenuToggle, MenuToggleElement} from '@patternfly/react-core/dist/esm/components/MenuToggle';
import {SearchInput} from '@patternfly/react-core/dist/esm/components/SearchInput';
import {Select, SelectList, SelectOption} from '@patternfly/react-core/dist/esm/components/Select';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Toolbar, ToolbarContent, ToolbarItem} from '@patternfly/react-core/dist/esm/components/Toolbar';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import {Table, Tbody, Td, Th, Thead, ThProps, Tr, TreeRowWrapper} from '@patternfly/react-table';
import BugIcon from '@patternfly/react-icons/dist/esm/icons/bug-icon';
import FilterIcon from '@patternfly/react-icons/dist/esm/icons/filter-icon';
import CodeBranchIcon from '@patternfly/react-icons/dist/esm/icons/code-branch-icon';
import CubesIcon from '@patternfly/react-icons/dist/esm/icons/cubes-icon';
import TagIcon from '@patternfly/react-icons/dist/esm/icons/tag-icon';
import {SCAN_SEVERITIES, ScanSeverity, Vulnerability} from '@models/CveModels';
import {useCveStore} from '@stores/useCveStore';
import {usePageContext} from '@compass/usePageContext';
import {useCompassStore} from '@compass/useCompassStore';
import {EpssHeader, EpssScore, RiskHeader, RiskScore, Severity} from '@shared/ui/ScoreInfo';
import {defaultVersion, sortedVersions} from '@shared/versionOrder';
import {VulnerabilityDrawer} from '../cves/VulnerabilityDrawer';
import {ComponentRow, componentRows, ComponentSort, findingIndex, FindingSummary, hasSeverity, pruneRows, rowFindings, scanSeverity, sortRows, total,} from './componentTree';
import './ComponentsPage.css';

interface SummaryProps {
    summary: FindingSummary;
}

/** How many findings of each severity a set carries, read left to right worst first. */
const SeveritySummary: React.FunctionComponent<SummaryProps> = ({summary}) => {
    if (summary.maxSeverity === undefined) {
        return <span className="components-none">-</span>;
    }
    return (
        <div className="components-severity-values">
            {SCAN_SEVERITIES
                .filter(severity => !['Negligible', 'Unknown'].includes(severity) )
                .map(severity => (
                    <Severity
                        key={severity}
                        severity={severity}
                        text={summary.bySeverity[severity]}
                    />
                ))}
        </div>
    );
};

/**
 * Every Camel component of one scanned ref with its dependencies, read from the
 * `components` module trees the scan publishes under `public/data/<ref>/components`.
 *
 * Each level is scored twice: the findings reported against the artifact of that
 * very row, and the findings of everything it depends on. A row whose own columns
 * are empty but whose dependency columns are not is fixed by bumping something
 * below it, not by touching the component itself.
 */
export const ComponentsPage: React.FunctionComponent = () => {

    const versions = useCveStore((s) => s.versions);
    const selectedRef = useCveStore((s) => s.selectedRef);
    const selectRef = useCveStore((s) => s.selectRef);
    const vulnerabilities = useCveStore((s) => s.vulnerabilities);
    const loading = useCveStore((s) => s.loading);
    const vulnerabilitiesLoading = useCveStore((s) => s.vulnerabilitiesLoading);
    const dependencyTrees = useCveStore((s) => s.dependencyTrees);
    const dependencyTreesLoading = useCveStore((s) => s.dependencyTreesLoading);
    const loadDependencyTrees = useCveStore((s) => s.loadDependencyTrees);
    const setDrawerPanel = useCompassStore((s) => s.setDrawerPanel);
    const setIsDrawerExpanded = useCompassStore((s) => s.setIsDrawerExpanded);

    const [isVersionOpen, setIsVersionOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [severities, setSeverities] = useState<ScanSeverity[]>([]);
    const [isSeverityOpen, setIsSeverityOpen] = useState(false);
    // Highest dependency risk first: the page opens on what a reader triages, until they sort on another column.
    const [sort, setSort] = useState<{index: number; sort: ComponentSort; direction: 'asc' | 'desc'}>(
        {index: 6, sort: 'transitiveRisk', direction: 'desc'}
    );
    // Collapsed by default: a ref carries a few hundred components and tens of thousands of nodes.
    const [expanded, setExpanded] = useState<string[]>([]);
    // The finding whose details the drawer shows, picked on the last level of the tree.
    const [selected, setSelected] = useState<Vulnerability>();

    const options = useMemo(() => sortedVersions(versions), [versions]);

    usePageContext(
        'Components',
        <Title headingLevel="h1" size="xl">Components</Title>,
        null,
        [selectedRef, vulnerabilities.length]
    );

    // The page opens on the last LTS release until the user picks another ref.
    useEffect(() => {
        if (!selectedRef) {
            const ref = defaultVersion(versions);
            if (ref) {
                selectRef(ref);
            }
        }
    }, [versions]);

    useEffect(() => {
        loadDependencyTrees();
    }, [selectedRef]);

    // Rows of another ref must not stay open once this one is shown.
    useEffect(() => {
        setExpanded([]);
        setSelected(undefined);
    }, [dependencyTrees, vulnerabilities]);

    const closeDrawer = useCallback(() => setSelected(undefined), []);

    // Declared after usePageContext so the panel survives a page context refresh.
    useEffect(() => {
        setDrawerPanel(selected ? <VulnerabilityDrawer vulnerability={selected} onClose={closeDrawer}/> : null);
        setIsDrawerExpanded(selected !== undefined);
    }, [selected]);

    // Leaving the page must not leave its drawer behind.
    useEffect(() => () => {
        setDrawerPanel(null);
        setIsDrawerExpanded(false);
    }, []);

    // Walked once per ref rather than once per row: the trees carry tens of thousands of nodes.
    const rows = useMemo(() => {
        if (!dependencyTrees) {
            return [];
        }
        const index = findingIndex(vulnerabilities);
        return (dependencyTrees.components ?? [])
            .map(module => componentRows(module, index))
            .sort((a, b) => a.artifactId.localeCompare(b.artifactId));
    }, [dependencyTrees, vulnerabilities]);

    /**
     * A component and a dependency are held to the same test, so a subtree is
     * only shown down to the rows that carry what the reader asked for. The
     * search only applies to the components, a reader looking for `camel-http`
     * wants its whole tree, not the dependencies that happen to be named alike.
     */
    const visible = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const matching = rows.filter(row => needle.length === 0 || row.artifactId.toLowerCase().includes(needle));
        const pruned = severities.length > 0
            ? pruneRows(matching, row => hasSeverity(row, severities))
            : pruneRows(matching, row => total(row) > 0);
        return sortRows(pruned, sort.sort, sort.direction);
    }, [rows, search, severities, sort]);

    if (loading && versions.length === 0) {
        return <Bullseye><Spinner aria-label="Loading components"/></Bullseye>;
    }

    // A ref carries a few hundred trees, so the toolbar stays usable while they arrive.
    const isLoadingRef = dependencyTreesLoading || (vulnerabilitiesLoading && vulnerabilities.length === 0);

    const versionToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
            ref={toggleRef}
            onClick={() => setIsVersionOpen(!isVersionOpen)}
            isExpanded={isVersionOpen}
            isDisabled={options.length === 0}
        >
            {selectedRef ?? 'Select version'}
        </MenuToggle>
    );

    const severityToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
            ref={toggleRef}
            onClick={() => setIsSeverityOpen(!isSeverityOpen)}
            isExpanded={isSeverityOpen}
            icon={<FilterIcon/>}
        >
            Severity
            {severities.length > 0 && <Badge isRead>{severities.length}</Badge>}
        </MenuToggle>
    );

    function toggleSeverity(severity: ScanSeverity) {
        setSeverities(current => current.includes(severity)
            ? current.filter(other => other !== severity)
            : [...current, severity]);
    }

    /** `index` is the position of the column in the header grid, which is what carries the indicator. */
    const sortProps = (index: number, column: ComponentSort): ThProps['sort'] => ({
        sortBy: {index: sort.index, direction: sort.direction},
        onSort: (_event, columnIndex, direction) => setSort({index: columnIndex, sort: column, direction}),
        columnIndex: index,
    });

    const toggle = (key: string) =>
        setExpanded(keys => keys.includes(key) ? keys.filter(other => other !== key) : [...keys, key]);

    /**
     * The findings of one row, as the last level of the tree: one leaf per CVE
     * reported against this very coordinate, which opens the drawer of that
     * finding. The scores are the ones of the finding itself, so the `this level`
     * columns of the row above read as the worst of the leaves below it.
     */
    const renderFindings = (row: ComponentRow, findings: Vulnerability[], level: number, index: {row: number}): React.ReactNode[] =>
        findings.map((finding, position) => {
            const props = {
                // A finding has nothing below it, which is how the tree table knows to draw no toggle.
                isExpanded: undefined,
                'aria-level': level,
                'aria-posinset': position + 1,
                'aria-setsize': findings.length,
                icon: <BugIcon/>,
            };
            const rowIndex = index.row++;
            // The wrapper only types the props the tree table itself reads and passes the
            // rest to the `tr`, so the focus and keyboard wiring of the leaf goes through
            // as plain row attributes.
            const rowAttributes: React.HTMLAttributes<HTMLTableRowElement> = {
                className: `pf-m-clickable${finding === selected ? ' pf-m-selected' : ''}`,
                'aria-selected': finding === selected,
                tabIndex: 0,
                onClick: () => setSelected(finding),
                onKeyDown: event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelected(finding);
                    }
                },
            };
            return (
                <TreeRowWrapper
                    key={`${row.key}#${position}:${finding.vulnerability}`}
                    row={{props}}
                    {...rowAttributes}
                >
                    <Td
                        dataLabel="Vulnerability"
                        treeRow={{
                            onCollapse: () => setSelected(finding),
                            props,
                            rowIndex,
                        }}
                    >
                        {finding.vulnerability}
                    </Td>
                    <Td dataLabel="Version" modifier="nowrap">{finding.installed}</Td>
                    <Td dataLabel="Severity (this level)">
                        <Severity severity={scanSeverity(finding.severity)} text={finding.severity}/>
                    </Td>
                    <Td dataLabel="Risk (this level)" textCenter modifier="nowrap">
                        <RiskScore value={finding.risk ?? undefined}/>
                    </Td>
                    <Td dataLabel="EPSS (this level)" textCenter modifier="nowrap">
                        <EpssScore value={finding.epss ?? undefined}/>
                    </Td>
                    {/* The dependency columns say nothing about a finding, it sits at this level by definition. */}
                    <Td dataLabel="Severity (dependencies)"><span className="components-none">-</span></Td>
                    <Td dataLabel="Risk (dependencies)" textCenter><span className="components-none">-</span></Td>
                    <Td dataLabel="EPSS (dependencies)" textCenter><span className="components-none">-</span></Td>
                </TreeRowWrapper>
            );
        });

    /**
     * Only the rows a reader can actually see are rendered: a collapsed subtree
     * is not walked at all, so opening one component does not put the whole
     * dependency graph of the ref into the DOM.
     */
    const renderRows = (treeRows: ComponentRow[], level: number, index: {row: number}): React.ReactNode[] =>
        treeRows.flatMap((row, position) => {
            // The findings of the row are children of it, listed before the dependencies they were reported against.
            const findings = rowFindings(row, severities);
            const hasChildren = row.children.length > 0 || findings.length > 0;
            const isExpanded = hasChildren && expanded.includes(row.key);
            const props = {
                // Undefined on a leaf, which is how the tree table knows to draw no toggle.
                isExpanded: hasChildren ? isExpanded : undefined,
                'aria-level': level,
                'aria-posinset': position + 1,
                'aria-setsize': row.children.length + findings.length,
                icon: level === 1 ? <CubesIcon/> : undefined,
            };
            const rowIndex = index.row++;
            return [
                <TreeRowWrapper key={row.key} row={{props}}>
                    <Td
                        dataLabel="Component"
                        treeRow={{
                            onCollapse: () => toggle(row.key),
                            props,
                            rowIndex,
                        }}
                    >
                        <span className="components-group">{`${row.groupId}:`}</span>
                        {row.artifactId}
                    </Td>
                    <Td dataLabel="Version" modifier="nowrap">
                        {/* A camel artifact is built from the selected ref, so its version says nothing new. */}
                        {row.groupId.startsWith('org.apache.camel') ? '' : row.version}
                    </Td>
                    <Td dataLabel="Severity (this level)">
                        <SeveritySummary summary={row.own}/>
                    </Td>
                    <Td dataLabel="Risk (this level)" textCenter modifier="nowrap">
                        <RiskScore value={row.own.maxRisk}/>
                    </Td>
                    <Td dataLabel="EPSS (this level)" textCenter modifier="nowrap">
                        <EpssScore value={row.own.maxEpss}/>
                    </Td>
                    <Td dataLabel="Severity (dependencies)">
                        <SeveritySummary summary={row.transitive}/>
                    </Td>
                    <Td dataLabel="Risk (dependencies)" textCenter modifier="nowrap">
                        <RiskScore value={row.transitive.maxRisk}/>
                    </Td>
                    <Td dataLabel="EPSS (dependencies)" textCenter modifier="nowrap">
                        <EpssScore value={row.transitive.maxEpss}/>
                    </Td>
                </TreeRowWrapper>,
                ...(isExpanded ? [
                    ...renderFindings(row, findings, level + 1, index),
                    ...renderRows(row.children, level + 1, index),
                ] : []),
            ];
        });

    return (
        <div className="page-section components-page">
            <Toolbar id="components-toolbar">
                <ToolbarContent alignItems="center">
                    <ToolbarItem>
                        <Select
                            id="components-version-select"
                            isOpen={isVersionOpen}
                            selected={selectedRef}
                            onSelect={(_event, value) => {
                                selectRef(value as string);
                                setIsVersionOpen(false);
                            }}
                            onOpenChange={setIsVersionOpen}
                            toggle={versionToggle}
                        >
                            <SelectList>
                                {options.map(version => (
                                    <SelectOption
                                        key={version.ref}
                                        value={version.ref}
                                        isSelected={version.ref === selectedRef}
                                        icon={version.kind === 'tag' ? <TagIcon/> : <CodeBranchIcon/>}
                                        description={version.release?.kind === 'lts' ? `LTS ${version.release.camelVersion}` : undefined}
                                    >
                                        {version.ref}
                                    </SelectOption>
                                ))}
                            </SelectList>
                        </Select>
                    </ToolbarItem>
                    <ToolbarItem>
                        <SearchInput
                            aria-label="Search components"
                            placeholder="Search component"
                            value={search}
                            onChange={(_event, value) => setSearch(value)}
                            onClear={() => setSearch('')}
                        />
                    </ToolbarItem>
                    <ToolbarItem>
                        <Select
                            id="components-severity-select"
                            isOpen={isSeverityOpen}
                            selected={severities}
                            onSelect={(_event, value) => toggleSeverity(value as ScanSeverity)}
                            onOpenChange={setIsSeverityOpen}
                            toggle={severityToggle}
                        >
                            <SelectList>
                                {SCAN_SEVERITIES.map(severity => (
                                    <SelectOption
                                        key={severity}
                                        value={severity}
                                        hasCheckbox
                                        isSelected={severities.includes(severity)}
                                    >
                                        {severity}
                                    </SelectOption>
                                ))}
                            </SelectList>
                        </Select>
                    </ToolbarItem>
                    <ToolbarItem variant="pagination">
                        <Badge>{`${visible.length} components`}</Badge>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>

            {isLoadingRef ? (
                <Bullseye><Spinner aria-label="Loading component dependency trees"/></Bullseye>
            ) : visible.length === 0 ? (
                <EmptyState headingLevel="h2" icon={CubesIcon} titleText="No components">
                    <EmptyStateBody>
                        {rows.length === 0
                            ? `No component dependency trees have been published for ${selectedRef ?? 'this version'}.`
                            : 'No component matches the current search and filters.'}
                    </EmptyStateBody>
                </EmptyState>
            ) : (
                <Table
                    aria-label={`Camel components of ${selectedRef} and their dependencies`}
                    variant="compact"
                    isTreeTable
                >
                    <Thead>
                        <Tr>
                            <Th rowSpan={2}>Component / dependency</Th>
                            <Th rowSpan={2} modifier="fitContent">Version</Th>
                            <Th colSpan={3} textCenter hasRightBorder>This level</Th>
                            <Th colSpan={3} textCenter>Dependencies</Th>
                        </Tr>
                        <Tr>
                            <Th modifier="fitContent">Severity</Th>
                            <Th modifier="fitContent" sort={sortProps(3, 'ownRisk')}><RiskHeader/></Th>
                            <Th modifier="fitContent" hasRightBorder sort={sortProps(4, 'ownEpss')}><EpssHeader/></Th>
                            <Th modifier="fitContent">Severity</Th>
                            <Th modifier="fitContent" sort={sortProps(6, 'transitiveRisk')}><RiskHeader/></Th>
                            <Th modifier="fitContent" sort={sortProps(7, 'transitiveEpss')}><EpssHeader/></Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {renderRows(visible, 1, {row: 0})}
                    </Tbody>
                </Table>
            )}
        </div>
    );
};
