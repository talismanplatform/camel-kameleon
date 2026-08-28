import React from 'react';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import {Content, ContentVariants} from '@patternfly/react-core/dist/esm/components/Content';
import {EmptyState, EmptyStateBody} from '@patternfly/react-core/dist/esm/components/EmptyState';
import {Label} from '@patternfly/react-core/dist/esm/components/Label';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Table, Tbody, Td, Th, Thead, Tr} from '@patternfly/react-table';
import CodeBranchIcon from '@patternfly/react-icons/dist/esm/icons/code-branch-icon';
import TagIcon from '@patternfly/react-icons/dist/esm/icons/tag-icon';
import {SCAN_SEVERITIES, VersionScan} from '@models/CveModels';
import {useCveStore} from '@stores/useCveStore';
import {usePageContext} from '@compass/usePageContext';
import './VersionsPage.css';
import {EpssHeader, EpssScore, RiskHeader, RiskScore, Severity} from '@shared/ui/ScoreInfo';
import {Tooltip} from '@patternfly/react-core/dist/esm/components/Tooltip';
import {formatScanAge, formatScanDate} from '@shared/scanDate';
import {sortedVersions} from '@shared/versionOrder';

export const VersionsPage: React.FunctionComponent = () => {

    const versions = useCveStore((s) => s.versions);
    const loading = useCveStore((s) => s.loading);

    usePageContext(
        'Versions',
        <Title headingLevel="h1" size="xl">Scanned versions</Title>,
        null,
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
                        <Th>Kind</Th>
                        <Th>JDK</Th>
                        <Th>Released</Th>
                        <Th>EOL</Th>
                        <Th modifier={'fitContent'}>Scanned</Th>
                        <Th modifier={'fitContent'}>Vulnerabilities</Th>
                        <Th textCenter>Severities</Th>
                        <Th key="risk" textCenter modifier={'fitContent'}><RiskHeader/></Th>
                        <Th key="epss" textCenter modifier={'fitContent'}><EpssHeader/></Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {sortedVersions(versions).map(version => (
                        <Tr key={version.ref} style={{verticalAlign: 'middle'}}>
                            <Td dataLabel="Type">
                                <Label
                                    variant="outline"
                                    // color={version.kind === 'tag' ? 'purple' : 'blue'}
                                    icon={version.kind === 'tag' ? <TagIcon/> : <CodeBranchIcon/>}
                                >
                                    {version.kind === 'tag' ? 'Tag' : 'Branch'}
                                </Label>
                            </Td>
                            <Td dataLabel="Name" modifier="nowrap">{version.ref}</Td>
                            <Td dataLabel="Kind" modifier="nowrap">
                                {isLts(version)
                                    ? <Label  color="green" >LTS</Label>
                                    : ''}
                            </Td>
                            <Td dataLabel="JDK" modifier="nowrap">{isLts(version) ? version.release?.jdkVersion : ''}</Td>
                            <Td dataLabel="Released" modifier="nowrap">{isLts(version) ? version.release?.releaseDate : ''}</Td>
                            <Td dataLabel="EOL" modifier="nowrap">{isLts(version) ? version.release?.eolDate : ''}</Td>
                            <Td dataLabel="Scanned" modifier="nowrap">
                                <ScannedAt scannedAt={version.scannedAt}/>
                            </Td>
                            <Td dataLabel="Vulnerabilities" textCenter>
                                {version.loaded
                                    ? <Content component={ContentVariants.p}>{version.total}</Content>
                                    : <Content component={ContentVariants.small}>Report unavailable</Content>}
                            </Td>
                            <Td dataLabel="By severity" modifier={'fitContent'}>
                                <div className={"severity-values"}>
                                    {SCAN_SEVERITIES
                                        .filter(severity => version.bySeverity[severity] > 0)
                                        .map(severity => (
                                            <Severity text={version.bySeverity[severity]} severity={severity} />
                                        ))}
                                </div>
                            </Td>
                            <Td dataLabel="Max risk" modifier="nowrap" textCenter>
                                <RiskScore value={version.maxRisk}/>
                            </Td>
                            <Td dataLabel="Max EPSS" modifier="nowrap" textCenter>
                                <EpssScore value={version.maxEpss}/>
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </div>
    );
};

/** The scan instant, with its relative age in a tooltip. `-` when never scanned. */
const ScannedAt: React.FunctionComponent<{ scannedAt?: string }> = ({scannedAt}) => {
    const age = formatScanAge(scannedAt);
    if (!age) {
        return <>{formatScanDate(scannedAt)}</>;
    }
    return (
        <Tooltip content={age} position={"bottom"}>
            <span>{formatScanDate(scannedAt)}</span>
        </Tooltip>
    );
};

/** `camel version list` marks long term support releases with `kind: lts`. */
function isLts(version: VersionScan): boolean {
    return version.release?.kind?.toLowerCase() === 'lts' && version.kind === 'tag';
}

