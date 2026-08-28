import React, {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Badge} from '@patternfly/react-core/dist/esm/components/Badge';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {EmptyState, EmptyStateBody} from '@patternfly/react-core/dist/esm/components/EmptyState';
import {Label} from '@patternfly/react-core/dist/esm/components/Label';
import {MenuToggle, MenuToggleElement} from '@patternfly/react-core/dist/esm/components/MenuToggle';
import {SearchInput} from '@patternfly/react-core/dist/esm/components/SearchInput';
import {Select, SelectList, SelectOption} from '@patternfly/react-core/dist/esm/components/Select';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {Switch} from '@patternfly/react-core/dist/esm/components/Switch';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Toolbar, ToolbarContent, ToolbarItem} from '@patternfly/react-core/dist/esm/components/Toolbar';
import {Tooltip} from '@patternfly/react-core/dist/esm/components/Tooltip';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import {Table, Tbody, Td, Th, Thead, Tr, TreeRowWrapper} from '@patternfly/react-table';
import ArrowRightIcon from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon';
import CodeBranchIcon from '@patternfly/react-icons/dist/esm/icons/code-branch-icon';
import CubesIcon from '@patternfly/react-icons/dist/esm/icons/cubes-icon';
import TagIcon from '@patternfly/react-icons/dist/esm/icons/tag-icon';
import {SCAN_SEVERITIES, SCAN_SEVERITY_LABEL_COLOR} from '@models/CveModels';
import {useCveStore} from '@stores/useCveStore';
import {ROUTES} from '@compass/navigation/Routes';
import {usePageContext} from '@compass/usePageContext';
import {EpssHeader, EpssScore, RiskHeader, RiskScore} from '@shared/ui/ScoreInfo';
import {defaultVersion, sortedVersions} from '@shared/versionOrder';
import {ComponentRow, FindingSummary, componentRows, findingIndex, total} from './componentTree';
import './ComponentsPage.css';

interface SummaryProps {
    summary: FindingSummary;
}

/** Worst severity of a set of findings plus how many there are, the breakdown in the tooltip. */
const SeveritySummary: React.FunctionComponent<SummaryProps> = ({summary}) => {
    if (summary.maxSeverity === undefined) {
        return <span className="components-none">-</span>;
    }
    return (
        <Tooltip
            position="top"
            content={
                <div className="components-severity-tooltip">
                    {SCAN_SEVERITIES
                        .filter(severity => summary.bySeverity[severity] > 0)
                        .map(severity => <div key={severity}>{`${severity}: ${summary.bySeverity[severity]}`}</div>)}
                </div>
            }
        >
            <Label color={SCAN_SEVERITY_LABEL_COLOR[summary.maxSeverity]} isCompact>
                {`${summary.maxSeverity} ${summary.count}`}
            </Label>
        </Tooltip>
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

    const navigate = useNavigate();
    const versions = useCveStore((s) => s.versions);
    const selectedRef = useCveStore((s) => s.selectedRef);
    const selectRef = useCveStore((s) => s.selectRef);
    const vulnerabilities = useCveStore((s) => s.vulnerabilities);
    const loading = useCveStore((s) => s.loading);
    const vulnerabilitiesLoading = useCveStore((s) => s.vulnerabilitiesLoading);
    const dependencyTrees = useCveStore((s) => s.dependencyTrees);
    const dependencyTreesLoading = useCveStore((s) => s.dependencyTreesLoading);
    const loadDependencyTrees = useCveStore((s) => s.loadDependencyTrees);
    const setFilters = useCveStore((s) => s.setFilters);

    const [isVersionOpen, setIsVersionOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [onlyAffected, setOnlyAffected] = useState(true);
    // Collapsed by default: a ref carries a few hundred components and tens of thousands of nodes.
    const [expanded, setExpanded] = useState<string[]>([]);

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
    useEffect(() => setExpanded([]), [dependencyTrees, vulnerabilities]);

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

    const visible = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return rows.filter(row =>
            (!onlyAffected || total(row) > 0)
            && (needle.length === 0 || row.artifactId.toLowerCase().includes(needle)));
    }, [rows, search, onlyAffected]);

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

    function showCves(artifactId: string) {
        setFilters({search: artifactId, severities: []});
        navigate(ROUTES.CVES);
    }

    const toggle = (key: string) =>
        setExpanded(keys => keys.includes(key) ? keys.filter(other => other !== key) : [...keys, key]);

    /**
     * Only the rows a reader can actually see are rendered: a collapsed subtree
     * is not walked at all, so opening one component does not put the whole
     * dependency graph of the ref into the DOM.
     */
    const renderRows = (treeRows: ComponentRow[], level: number, index: {row: number}): React.ReactNode[] =>
        treeRows.flatMap((row, position) => {
            const hasChildren = row.children.length > 0;
            const isExpanded = hasChildren && expanded.includes(row.key);
            const props = {
                // Undefined on a leaf, which is how the tree table knows to draw no toggle.
                isExpanded: hasChildren ? isExpanded : undefined,
                'aria-level': level,
                'aria-posinset': position + 1,
                'aria-setsize': row.children.length,
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
                    <Td dataLabel="Version" modifier="nowrap">{row.version}</Td>
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
                    <Td modifier="fitContent">
                        {row.own.count > 0 && (
                            <Button
                                variant="link"
                                isInline
                                icon={<ArrowRightIcon/>}
                                iconPosition="end"
                                onClick={() => showCves(row.artifactId)}
                            >
                                CVEs
                            </Button>
                        )}
                    </Td>
                </TreeRowWrapper>,
                ...(isExpanded ? renderRows(row.children, level + 1, index) : []),
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
                        <Switch
                            id="components-only-affected"
                            label="Only components with findings"
                            isChecked={onlyAffected}
                            onChange={(_event, checked) => setOnlyAffected(checked)}
                        />
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
                            : 'No component matches the current search.'}
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
                            <Th rowSpan={2} screenReaderText="Actions"/>
                        </Tr>
                        <Tr>
                            <Th modifier="fitContent">Severity</Th>
                            <Th modifier="fitContent"><RiskHeader/></Th>
                            <Th modifier="fitContent" hasRightBorder><EpssHeader/></Th>
                            <Th modifier="fitContent">Severity</Th>
                            <Th modifier="fitContent"><RiskHeader/></Th>
                            <Th modifier="fitContent"><EpssHeader/></Th>
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
