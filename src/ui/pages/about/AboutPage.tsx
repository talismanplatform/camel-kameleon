import React from 'react';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {Card, CardBody, CardTitle} from '@patternfly/react-core/dist/esm/components/Card';
import {Content, ContentVariants} from '@patternfly/react-core/dist/esm/components/Content';
import {DescriptionList, DescriptionListDescription, DescriptionListGroup, DescriptionListTerm} from '@patternfly/react-core/dist/esm/components/DescriptionList';
import {List, ListItem} from '@patternfly/react-core/dist/esm/components/List';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Grid, GridItem} from '@patternfly/react-core/dist/esm/layouts/Grid';
import ExternalLinkAltIcon from '@patternfly/react-icons/dist/esm/icons/external-link-alt-icon';
import {usePageContext} from '@compass/usePageContext';

export const AboutPage: React.FunctionComponent = () => {

    usePageContext('About', <Title headingLevel="h1" size="xl">About</Title>, null, []);

    return (
        <div className="page-section about-page">
            <Grid hasGutter>
                <GridItem md={6}>
                    <Card isFullHeight>
                        <CardTitle>Apache Camel CVE Dashboard</CardTitle>
                        <CardBody>
                            <Content component={ContentVariants.p}>
                                This dashboard tracks published vulnerabilities that affect Apache Camel
                                components, the releases they impact and the versions that carry a fix.
                            </Content>
                            <Content component={ContentVariants.p}>
                                The advisory data shipped with this scaffold is sample fixture data served
                                from <code>src/api/CveApi.ts</code>. Point that module at the real advisory
                                feed to make the dashboard live.
                            </Content>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem md={6}>
                    <Card isFullHeight>
                        <CardTitle>Stack</CardTitle>
                        <CardBody>
                            <DescriptionList isCompact isHorizontal>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>UI</DescriptionListTerm>
                                    <DescriptionListDescription>PatternFly 6 Compass layout</DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Framework</DescriptionListTerm>
                                    <DescriptionListDescription>React 18, React Router 6</DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Build</DescriptionListTerm>
                                    <DescriptionListDescription>Vite, TypeScript</DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>State</DescriptionListTerm>
                                    <DescriptionListDescription>Zustand stores</DescriptionListDescription>
                                </DescriptionListGroup>
                            </DescriptionList>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem span={12}>
                    <Card>
                        <CardTitle>Where the data comes from</CardTitle>
                        <CardBody>
                            <List>
                                <ListItem>Apache Camel security advisories</ListItem>
                                <ListItem>National Vulnerability Database CVSS scores</ListItem>
                                <ListItem>Camel release metadata for supported streams</ListItem>
                            </List>
                            <Button
                                variant="link"
                                isInline
                                component="a"
                                href="https://camel.apache.org/security/"
                                target="_blank"
                                rel="noopener noreferrer"
                                icon={<ExternalLinkAltIcon/>}
                                iconPosition="end"
                            >
                                camel.apache.org/security
                            </Button>
                        </CardBody>
                    </Card>
                </GridItem>
            </Grid>
        </div>
    );
};
