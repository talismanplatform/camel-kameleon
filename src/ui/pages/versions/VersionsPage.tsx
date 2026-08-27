import React from 'react';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import {Flex, FlexItem} from '@patternfly/react-core/dist/esm/layouts/Flex';
import {Content, ContentVariants} from '@patternfly/react-core/dist/esm/components/Content';
import {EmptyState, EmptyStateBody} from '@patternfly/react-core/dist/esm/components/EmptyState';
import {Label, LabelGroup} from '@patternfly/react-core/dist/esm/components/Label';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Tooltip} from '@patternfly/react-core/dist/esm/components/Tooltip';
import {Table, Tbody, Td, Th, Thead, Tr} from '@patternfly/react-table';
import CodeBranchIcon from '@patternfly/react-icons/dist/esm/icons/code-branch-icon';
import TagIcon from '@patternfly/react-icons/dist/esm/icons/tag-icon';
import {SCAN_SEVERITIES, SCAN_SEVERITY_COLOR, VersionScan} from '@models/CveModels';
import {useCveStore} from '@stores/useCveStore';
import {usePageContext} from '@compass/usePageContext';
import {formatScanAge, formatScanDate} from '@shared/scanDate';
import './VersionsPage.css';

export const VersionsPage: React.FunctionComponent = () => {

    const versions = useCveStore((s) => s.versions);
    const loading = useCveStore((s) => s.loading);

    usePageContext(
        'Versions',
        <Title headingLevel="h1" size="xl">Scanned versions</Title>,
        <LabelGroup>
            <Label isCompact variant="outline" icon={<TagIcon/>}>{`${count(versions, 'tag')} tags`}</Label>
            <Label isCompact variant="outline" icon={<CodeBranchIcon/>}>{`${count(versions, 'branch')} branches`}</Label>
        </LabelGroup>,
        [versions.length]
    );

    if (loading && versions.length === 0) {
        return <Bullseye><Spinner aria-label="Loading scanned versions"/></Bullseye>;
    }

    if (versions.length === 0) {
        return (
            <EmptyState headingLevel="h2" icon={CodeBranchIcon} titleText="No scanned versions">
                <EmptyStateBody>
                    No branch or tag has been scanned yet. The nightly workflow fills
                    <code> public/data</code> from <code>versions.json</code>.
                </EmptyStateBody>
            </EmptyState>
        );
    }

    return (
        <div className="page-section versions-page">
            <Table aria-label="Scanned Apache Camel branches and tags" variant="compact">
                <Thead>
                    <Tr>
                        <Th>Type</Th>
                        <Th>Name</Th>
                        <Th>Scanned</Th>
                        <Th>Vulnerabilities</Th>
                        <Th>By severity</Th>
                        <Th>Max risk</Th>
                        <Th>Max EPSS</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {sorted(versions).map(version => (
                        <Tr key={version.ref}>
                            <Td dataLabel="Type">
                                <Label
                                    isCompact
                                    variant="outline"
                                    color={version.kind === 'tag' ? 'purple' : 'blue'}
                                    icon={version.kind === 'tag' ? <TagIcon/> : <CodeBranchIcon/>}
                                >
                                    {version.kind === 'tag' ? 'Tag' : 'Branch'}
                                </Label>
                            </Td>
                            <Td dataLabel="Name" modifier="nowrap">{version.ref}</Td>
                            <Td dataLabel="Scanned" modifier="nowrap">
                                {version.scannedAt ? <ScannedAt scannedAt={version.scannedAt}/> : '-'}
                            </Td>
                            <Td dataLabel="Vulnerabilities">
                                {version.loaded
                                    ? <Label isCompact color={version.total > 0 ? 'red' : 'green'}>{version.total}</Label>
                                    : <Content component={ContentVariants.small}>Report unavailable</Content>}
                            </Td>
                            <Td dataLabel="By severity">
                                <LabelGroup numLabels={SCAN_SEVERITIES.length}>
                                    {SCAN_SEVERITIES
                                        .filter(severity => version.bySeverity[severity] > 0)
                                        .map(severity => (
                                            <Label key={severity} isCompact color={SCAN_SEVERITY_COLOR[severity]}>
                                                {`${severity} ${version.bySeverity[severity]}`}
                                            </Label>
                                        ))}
                                </LabelGroup>
                            </Td>
                            <Td dataLabel="Max risk" modifier="nowrap">{formatScore(version.maxRisk)}</Td>
                            <Td dataLabel="Max EPSS" modifier="nowrap">{formatEpss(version.maxEpss)}</Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </div>
    );
};

/** Absolute date, with the relative age kept subtle next to it. */
const ScannedAt: React.FunctionComponent<{ scannedAt: string }> = ({scannedAt}) => {
    const age = formatScanAge(scannedAt);
    return (
        <Tooltip content={scannedAt}>
            <Flex gap={{default: 'gapSm'}} alignItems={{default: 'alignItemsCenter'}}>
                <FlexItem>{formatScanDate(scannedAt)}</FlexItem>
                {age && <FlexItem><span className="scan-age">{`(${age})`}</span></FlexItem>}
            </Flex>
        </Tooltip>
    );
};

/** Tags first, then branches, each newest looking name first. */
function sorted(versions: VersionScan[]): VersionScan[] {
    return [...versions].sort((a, b) =>
        a.kind === b.kind ? b.ref.localeCompare(a.ref) : (a.kind === 'tag' ? -1 : 1));
}

function count(versions: VersionScan[], kind: VersionScan['kind']): number {
    return versions.filter(version => version.kind === kind).length;
}

/** Grype risk score, one decimal. */
function formatScore(value?: number): string {
    return value === undefined ? '-' : value.toFixed(1);
}

/** EPSS is a probability, so it reads best as a percentage. */
function formatEpss(value?: number): string {
    return value === undefined ? '-' : `${(value * 100).toFixed(1)}%`;
}
