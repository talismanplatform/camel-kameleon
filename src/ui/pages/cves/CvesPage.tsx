import React, {useEffect, useMemo, useState} from 'react';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {EmptyState, EmptyStateActions, EmptyStateBody, EmptyStateFooter} from '@patternfly/react-core/dist/esm/components/EmptyState';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Table, Tbody, Td, Th, Thead, Tr} from '@patternfly/react-table';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
import {SCAN_SEVERITIES, ScanSeverity, Vulnerability} from '@models/CveModels';
import {filterVulnerabilities, useCveStore} from '@stores/useCveStore';
import {usePageContext} from '@compass/usePageContext';
import {EpssHeader, EpssScore, RiskHeader, RiskScore, Severity} from '@shared/ui/ScoreInfo';
import {defaultVersion, sortedVersions} from '@shared/versionOrder';
import {CvesToolbar} from './CvesToolbar';
import './CvesPage.css';
import {capitalize} from "@patternfly/react-core";

type SortableColumn = 'vulnerability' | 'severity' | 'groupId' | 'artifactId' | 'installed' | 'fixed_in' | 'epss' | 'risk';

const COLUMNS: {
    key: SortableColumn | 'description';
    label: React.ReactNode;
    sortable: boolean;
    modifier?: 'breakWord' | 'fitContent' | 'nowrap' | 'truncate' | 'wrap';
    textCenter?: boolean;
}[] = [
    {key: 'vulnerability', label: 'Vulnerability', sortable: true},
    {key: 'severity', label: 'Severity', sortable: true, modifier: 'fitContent'},
    {key: 'groupId', label: 'Group', sortable: true},
    {key: 'artifactId', label: 'Artifact', sortable: true},
    {key: 'installed', label: 'Installed', sortable: true},
    {key: 'fixed_in', label: 'Fixed in', sortable: true},
    // {key: 'description', label: 'Description', sortable: false},
    {key: 'epss', label: <EpssHeader/>, sortable: true},
    {key: 'risk', label: <RiskHeader/>, sortable: true},
];

const RISK_INDEX = COLUMNS.findIndex(column => column.key === 'risk');

/** No fix released reads better than the scanner's `(not-fixed)` / `(unknown)`. */
const NO_FIX = /^\(.*\)$/;

export const CvesPage: React.FunctionComponent = () => {

    const versions = useCveStore((s) => s.versions);
    const selectedRef = useCveStore((s) => s.selectedRef);
    const vulnerabilities = useCveStore((s) => s.vulnerabilities);
    const loading = useCveStore((s) => s.loading);
    const vulnerabilitiesLoading = useCveStore((s) => s.vulnerabilitiesLoading);
    const filters = useCveStore((s) => s.filters);
    const setFilters = useCveStore((s) => s.setFilters);
    const resetFilters = useCveStore((s) => s.resetFilters);
    const selectRef = useCveStore((s) => s.selectRef);

    // Risk descending: the findings that need attention first come first.
    const [sortIndex, setSortIndex] = useState(RISK_INDEX);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const options = useMemo(() => sortedVersions(versions), [versions]);

    usePageContext(
        'Vulnerabilities',
        <Title headingLevel="h1" size="xl">Vulnerabilities</Title>,
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

    const filtered = useMemo(() => filterVulnerabilities(vulnerabilities, filters), [vulnerabilities, filters]);

    const sorted = useMemo(() => {
        const column = COLUMNS[sortIndex]?.key as SortableColumn;
        const factor = sortDirection === 'asc' ? 1 : -1;
        return [...filtered].sort((a, b) => {
            if (column === 'severity') {
                return (severityRank(a.severity) - severityRank(b.severity)) * factor;
            }
            if (column === 'risk' || column === 'epss') {
                return ((a[column] ?? -1) - (b[column] ?? -1)) * factor;
            }
            return String(a[column] ?? '').localeCompare(String(b[column] ?? '')) * factor;
        });
    }, [filtered, sortIndex, sortDirection]);

    /** The advisory itself lives on GitHub, so a row opens its data source. */
    function openDataSource(vulnerability: Vulnerability) {
        if (vulnerability.dataSource) {
            window.open(vulnerability.dataSource, '_blank', 'noopener,noreferrer');
        }
    }

    if ((loading && versions.length === 0) || (vulnerabilitiesLoading && vulnerabilities.length === 0)) {
        return <Bullseye><Spinner aria-label="Loading vulnerabilities"/></Bullseye>;
    }

    return (
        <div className="page-section cves-page">
            <CvesToolbar
                versions={options}
                selectedRef={selectedRef}
                filters={filters}
                resultCount={sorted.length}
                onSelectRef={selectRef}
                onChange={setFilters}
                onReset={resetFilters}
            />
            {sorted.length === 0 ? (
                <EmptyState headingLevel="h2" icon={SearchIcon} titleText="No matching vulnerabilities">
                    <EmptyStateBody>
                        {vulnerabilities.length === 0
                            ? `No report is available for ${selectedRef ?? 'this version'}.`
                            : 'No finding matches the current filters.'}
                    </EmptyStateBody>
                    <EmptyStateFooter>
                        <EmptyStateActions>
                            <Button variant="link" onClick={resetFilters}>Clear all filters</Button>
                        </EmptyStateActions>
                    </EmptyStateFooter>
                </EmptyState>
            ) : (
                <Table aria-label="Apache Camel vulnerabilities" variant="compact" isStriped>
                    <Thead>
                        <Tr>
                            {COLUMNS.map((column, index) => (
                                <Th
                                    key={column.key}
                                    modifier={column.modifier}
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
                        {sorted.map((vulnerability, index) => (
                            <Tr
                                key={`${vulnerability.vulnerability}-${vulnerability.groupId}-${vulnerability.artifactId}-${index}`}
                                isClickable
                                onRowClick={() => openDataSource(vulnerability)}
                            >
                                <Td dataLabel="Vulnerability" modifier="nowrap">
                                    <span className="cve-id">{vulnerability.vulnerability}</span>
                                </Td>
                                <Td dataLabel="Severity">
                                    <Severity text={vulnerability.severity} severity={capitalize(vulnerability.severity) as ScanSeverity} />
                                </Td>
                                <Td dataLabel="Group" modifier="nowrap">{vulnerability.groupId ?? '-'}</Td>
                                <Td dataLabel="Artifact" modifier="nowrap">{vulnerability.artifactId ?? vulnerability.name}</Td>
                                <Td dataLabel="Installed" modifier="nowrap">{vulnerability.installed}</Td>
                                <Td dataLabel="Fixed in" modifier="nowrap">
                                    {NO_FIX.test(vulnerability.fixed_in)
                                        ? <span className="cve-no-fix">No fix</span>
                                        : vulnerability.fixed_in}
                                </Td>
                                {/*<Td dataLabel="Description">*/}
                                {/*    <span className="cve-description">{vulnerability.description}</span>*/}
                                {/*</Td>*/}
                                <Td dataLabel="EPSS" textCenter modifier="nowrap">
                                    <EpssScore value={vulnerability.epss ?? undefined}/>
                                </Td>
                                <Td dataLabel="Risk" textCenter modifier="nowrap">
                                    <RiskScore value={vulnerability.risk ?? undefined}/>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            )}
        </div>
    );
};

/** Severities the scanner does not recognise read as `Unknown`. */
function severityOf(severity: string): ScanSeverity {
    return SCAN_SEVERITIES.find(known => known.toLowerCase() === severity?.toLowerCase()) ?? 'Unknown';
}

/** Critical first, so ascending sort matches how the column reads elsewhere. */
function severityRank(severity: string): number {
    return SCAN_SEVERITIES.indexOf(severityOf(severity));
}
