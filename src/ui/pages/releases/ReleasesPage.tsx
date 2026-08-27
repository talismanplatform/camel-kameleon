import React from 'react';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import {Label, LabelGroup} from '@patternfly/react-core/dist/esm/components/Label';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Table, Tbody, Td, Th, Thead, Tr} from '@patternfly/react-table';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon';
import {shallow} from 'zustand/shallow';
import {useCveStore} from '@stores/useCveStore';
import {usePageContext} from '@compass/usePageContext';

export const ReleasesPage: React.FunctionComponent = () => {

    const [releases, loading] = useCveStore((s) => [s.releases, s.loading], shallow);

    usePageContext(
        'Releases',
        <Title headingLevel="h1" size="xl">Release exposure</Title>,
        <Label isCompact color="blue">Preview</Label>,
        []
    );

    if (loading && releases.length === 0) {
        return <Bullseye><Spinner aria-label="Loading releases"/></Bullseye>;
    }

    return (
        <div className="page-section releases-page">
            <Table aria-label="Apache Camel releases" variant="compact">
                <Thead>
                    <Tr>
                        <Th>Version</Th>
                        <Th>Released</Th>
                        <Th>Support</Th>
                        <Th>Open CVEs</Th>
                        <Th>Fixes shipped</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {releases.map(release => (
                        <Tr key={release.version}>
                            <Td dataLabel="Version">{release.version}</Td>
                            <Td dataLabel="Released">{release.released}</Td>
                            <Td dataLabel="Support">
                                <LabelGroup>
                                    {release.lts && <Label isCompact color="purple">LTS</Label>}
                                    <Label
                                        isCompact
                                        color={release.supported ? 'green' : 'grey'}
                                        icon={release.supported ? <CheckCircleIcon/> : undefined}
                                    >
                                        {release.supported ? 'Supported' : 'End of life'}
                                    </Label>
                                </LabelGroup>
                            </Td>
                            <Td dataLabel="Open CVEs">
                                <Label
                                    isCompact
                                    color={release.openCves > 0 ? 'red' : 'green'}
                                    icon={release.openCves > 0 ? <ExclamationTriangleIcon/> : <CheckCircleIcon/>}
                                >
                                    {release.openCves}
                                </Label>
                            </Td>
                            <Td dataLabel="Fixes shipped">{release.fixedCves}</Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </div>
    );
};
