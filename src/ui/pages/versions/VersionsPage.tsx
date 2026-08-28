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
import {LastScanDate} from "@shared/ui/LastScanDate";
import {EpssHeader, EpssScore, RiskHeader, RiskScore, Severity} from '@shared/ui/ScoreInfo';

export const VersionsPage: React.FunctionComponent = () => {

    const versions = useCveStore((s) => s.versions);
    const loading = useCveStore((s) => s.loading);

    usePageContext(
        'Versions',
        <Title headingLevel="h1" size="xl">Scanned versions</Title>,
        <LastScanDate/>,
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
                        <Th modifier={'fitContent'}>Vulnerabilities</Th>
                        <Th textCenter>Severities</Th>
                        <Th key="risk" textCenter modifier={'fitContent'}><RiskHeader/></Th>
                        <Th key="epss" textCenter modifier={'fitContent'}><EpssHeader/></Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {sorted(versions).map(version => (
                        <Tr key={version.ref}>
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
                            <Td dataLabel="Vulnerabilities" textCenter>
                                {version.loaded
                                    ? <p>{version.total}</p>
                                    : <Content component={ContentVariants.small}>Report unavailable</Content>}
                            </Td>
                            <Td dataLabel="By severity" modifier={'fitContent'}>
                                <div className={"severity-values"}>
                                    {SCAN_SEVERITIES
                                        .filter(severity => version.bySeverity[severity] > 0)
                                        .map(severity => (
                                            <Severity count={version.bySeverity[severity]} severity={severity} />
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

/** By name: `main` leads because it is the development branch, the rest descend. */
function sorted(versions: VersionScan[]): VersionScan[] {
    return [...versions].sort((a, b) => {
        if (a.ref === 'main' || b.ref === 'main') {
            return a.ref === 'main' ? (b.ref === 'main' ? 0 : -1) : 1;
        }
        return b.ref.localeCompare(a.ref);
    });
}

/** `camel version list` marks long term support releases with `kind: lts`. */
function isLts(version: VersionScan): boolean {
    return version.release?.kind?.toLowerCase() === 'lts' && version.kind === 'tag';
}

function count(versions: VersionScan[], kind: VersionScan['kind']): number {
    return versions.filter(version => version.kind === kind).length;
}
