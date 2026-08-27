import React, {useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {EmptyState, EmptyStateActions, EmptyStateBody, EmptyStateFooter} from '@patternfly/react-core/dist/esm/components/EmptyState';
import {Label, LabelGroup} from '@patternfly/react-core/dist/esm/components/Label';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Table, Tbody, Td, Th, Thead, Tr} from '@patternfly/react-table';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
import BugIcon from '@patternfly/react-icons/dist/esm/icons/bug-icon';
import {Cve, SEVERITIES} from '@models/CveModels';
import {filterCves, useCveStore} from '@stores/useCveStore';
import {useCompassStore} from '@compass/useCompassStore';
import {usePageContext} from '@compass/usePageContext';
import {ROUTES} from '@compass/navigation/Routes';
import {SeverityLabel} from '@shared/ui/SeverityLabel';
import {StatusLabel} from '@shared/ui/StatusLabel';
import {CveDrawerPanel} from './CveDrawerPanel';
import {CvesToolbar} from './CvesToolbar';
import './CvesPage.css';

type SortableColumn = 'cveId' | 'severity' | 'cvssScore' | 'published';

const COLUMNS: { key: SortableColumn | 'components' | 'status'; label: string; sortable: boolean }[] = [
    {key: 'cveId', label: 'CVE', sortable: true},
    {key: 'severity', label: 'Severity', sortable: true},
    {key: 'cvssScore', label: 'CVSS', sortable: true},
    {key: 'components', label: 'Components', sortable: false},
    {key: 'status', label: 'Status', sortable: false},
    {key: 'published', label: 'Published', sortable: true},
];

export const CvesPage: React.FunctionComponent = () => {

    const navigate = useNavigate();
    const {cveId} = useParams();
    const cves = useCveStore((s) => s.cves);
    const loading = useCveStore((s) => s.loading);
    const filters = useCveStore((s) => s.filters);
    const selectedCveId = useCveStore((s) => s.selectedCveId);
    const setFilters = useCveStore((s) => s.setFilters);
    const resetFilters = useCveStore((s) => s.resetFilters);
    const selectCve = useCveStore((s) => s.selectCve);
    const setDrawerPanel = useCompassStore((s) => s.setDrawerPanel);
    const setIsDrawerExpanded = useCompassStore((s) => s.setIsDrawerExpanded);

    const [sortIndex, setSortIndex] = useState(1);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    usePageContext(
        'Vulnerabilities',
        <Title headingLevel="h1" size="xl">Vulnerabilities</Title>,
        <LabelGroup>
            <Label isCompact variant="outline">{`${cves.length} advisories`}</Label>
        </LabelGroup>,
        [cves.length]
    );

    // A CVE id in the URL opens the detail drawer directly, which makes rows linkable.
    useEffect(() => {
        if (cveId) {
            selectCve(cveId);
        }
    }, [cveId]);

    const filtered = useMemo(() => filterCves(cves, filters), [cves, filters]);

    const sorted = useMemo(() => {
        const column = COLUMNS[sortIndex]?.key as SortableColumn;
        const factor = sortDirection === 'asc' ? 1 : -1;
        return [...filtered].sort((a, b) => {
            if (column === 'severity') {
                return (SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity)) * factor;
            }
            if (column === 'cvssScore') {
                return (b.cvssScore - a.cvssScore) * factor;
            }
            return String(a[column] ?? '').localeCompare(String(b[column] ?? '')) * factor;
        });
    }, [filtered, sortIndex, sortDirection]);

    const selected = cves.find(cve => cve.cveId === selectedCveId);

    // The drawer content lives in the shell, so the page publishes it whenever the selection changes.
    useEffect(() => {
        if (selected) {
            setDrawerPanel(<CveDrawerPanel cve={selected} onClose={closeDrawer}/>);
            setIsDrawerExpanded(true);
        } else {
            setIsDrawerExpanded(false);
            setDrawerPanel(null);
        }
        return () => {
            setIsDrawerExpanded(false);
            setDrawerPanel(null);
        };
    }, [selectedCveId, cves]);

    function closeDrawer() {
        selectCve(undefined);
        navigate(ROUTES.CVES);
    }

    function openCve(cve: Cve) {
        selectCve(cve.cveId);
        navigate(`/cves/${cve.cveId}`);
    }

    if (loading && cves.length === 0) {
        return <Bullseye><Spinner aria-label="Loading vulnerabilities"/></Bullseye>;
    }

    return (
        <div className="page-section cves-page">
            <CvesToolbar filters={filters} resultCount={sorted.length} onChange={setFilters} onReset={resetFilters}/>
            {sorted.length === 0 ? (
                <EmptyState headingLevel="h2" icon={SearchIcon} titleText="No matching CVEs">
                    <EmptyStateBody>No advisory matches the current filters.</EmptyStateBody>
                    <EmptyStateFooter>
                        <EmptyStateActions>
                            <Button variant="link" onClick={resetFilters}>Clear all filters</Button>
                        </EmptyStateActions>
                    </EmptyStateFooter>
                </EmptyState>
            ) : (
                <Table aria-label="Apache Camel CVEs" variant="compact" isStriped>
                    <Thead>
                        <Tr>
                            {COLUMNS.map((column, index) => (
                                <Th
                                    key={column.key}
                                    sort={column.sortable ? {
                                        sortBy: {index: sortIndex, direction: sortDirection},
                                        onSort: (_event, columnIndex, direction) => {
                                            setSortIndex(columnIndex);
                                            setSortDirection(direction);
                                        },
                                        columnIndex: index,
                                    } : undefined}
                                >
                                    {column.label}
                                </Th>
                            ))}
                        </Tr>
                    </Thead>
                    <Tbody>
                        {sorted.map(cve => (
                            <Tr
                                key={cve.cveId}
                                isClickable
                                isRowSelected={cve.cveId === selectedCveId}
                                onRowClick={() => openCve(cve)}
                            >
                                <Td dataLabel="CVE">
                                    <div className="cve-cell">
                                        <span className="cve-id">{cve.cveId}</span>
                                        <span className="cve-title">{cve.title}</span>
                                    </div>
                                </Td>
                                <Td dataLabel="Severity"><SeverityLabel severity={cve.severity} isCompact/></Td>
                                <Td dataLabel="CVSS">
                                    <LabelGroup>
                                        <Label isCompact variant="outline">{cve.cvssScore}</Label>
                                        {cve.exploitAvailable && <Label isCompact color="red" icon={<BugIcon/>}>Exploited</Label>}
                                    </LabelGroup>
                                </Td>
                                <Td dataLabel="Components">
                                    <LabelGroup numLabels={2}>
                                        {cve.components.map(component => <Label key={component} isCompact>{component}</Label>)}
                                    </LabelGroup>
                                </Td>
                                <Td dataLabel="Status"><StatusLabel status={cve.status} isCompact/></Td>
                                <Td dataLabel="Published">{cve.published}</Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            )}
        </div>
    );
};
