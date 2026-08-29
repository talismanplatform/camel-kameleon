import React from 'react';
import {Link} from 'react-router-dom';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {Card, CardBody, CardTitle} from '@patternfly/react-core/dist/esm/components/Card';
import {Content, ContentVariants} from '@patternfly/react-core/dist/esm/components/Content';
import {DescriptionList, DescriptionListDescription, DescriptionListGroup, DescriptionListTerm} from '@patternfly/react-core/dist/esm/components/DescriptionList';
import {List, ListItem} from '@patternfly/react-core/dist/esm/components/List';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Grid, GridItem} from '@patternfly/react-core/dist/esm/layouts/Grid';
import ExternalLinkAltIcon from '@patternfly/react-icons/dist/esm/icons/external-link-alt-icon';
import {useCveStore} from '@stores/useCveStore';
import {ROUTES} from '@compass/navigation/Routes';
import {usePageContext} from '@compass/usePageContext';
import {LastScanDate} from '@shared/ui/LastScanDate';
import {formatScanDate} from '@shared/scanDate';
import './AboutPage.css';

interface ExternalLinkProps {
    href: string;
    children: React.ReactNode;
}

const ExternalLink: React.FunctionComponent<ExternalLinkProps> = ({href, children}) => (
    <Button
        variant="link"
        isInline
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        icon={<ExternalLinkAltIcon/>}
        iconPosition="end"
    >
        {children}
    </Button>
);

/** What each page answers, so the About page doubles as the guide to the dashboard. */
const PAGES: {route: string, name: string, does: React.ReactNode}[] = [
    {
        route: ROUTES.DASHBOARD,
        name: 'Dashboard',
        does: 'Severity counters, remediation progress, the most affected components and the scan coverage of every ref.',
    },
    {
        route: ROUTES.CVES,
        name: 'CVEs',
        does: 'Every finding of the selected ref, searchable and sortable, with a drawer that says which Camel modules pull the vulnerable artifact in. /cves/:cveId opens that drawer directly.',
    },
    {
        route: ROUTES.COMPONENTS,
        name: 'Components',
        does: 'The Camel components of the selected ref as a tree table, each level scoring its own findings apart from those of the dependencies below it.',
    },
    {
        route: ROUTES.VERSIONS,
        name: 'Versions',
        does: 'One row per scanned branch or tag: kind, scan date, release metadata, findings by severity, max risk and max EPSS.',
    },
];

export const AboutPage: React.FunctionComponent = () => {

    const versions = useCveStore((s) => s.versions);
    const scanInfo = useCveStore((s) => s.scanInfo);

    usePageContext('About', <Title headingLevel="h1" size="xl">About</Title>, <LastScanDate/>, []);

    const scanned = scanInfo?.refs ?? [];
    const findings = versions.reduce((sum, version) => sum + version.total, 0);
    const grypeVersion = scanned.find(ref => ref.grypeVersion)?.grypeVersion;
    const latestRun = [...scanned].sort((a, b) => a.scannedAt.localeCompare(b.scannedAt)).pop();

    return (
        <div className="page-section about-page">
            <Grid hasGutter>
                <GridItem md={6}>
                    <Card isFullHeight>
                        <CardTitle>Apache Camel Kameleon</CardTitle>
                        <CardBody>
                            <Content component={ContentVariants.p}>
                                Kameleon scans the branches and tags of <ExternalLink href="https://github.com/apache/camel">apache/camel</ExternalLink> for
                                known vulnerabilities and shows what they mean for the components you actually
                                depend on. A finding is rarely in Camel itself: it sits in a library some module
                                pulls in, so every view keeps the path from a Camel component down to the
                                vulnerable artifact.
                            </Content>
                            <Content component={ContentVariants.p}>
                                The dashboard is a static site. It has no backend of its own — it reads the
                                report files a scheduled scan commits into the repository, so what you see is
                                exactly what the last scan produced.
                            </Content>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem md={6}>
                    <Card isFullHeight>
                        <CardTitle>Published data set</CardTitle>
                        <CardBody>
                            <DescriptionList isCompact isHorizontal>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Scanned refs</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        {versions.length > 0
                                            ? `${versions.length} (${versions.filter(v => v.kind === 'tag').length} tags, ${versions.filter(v => v.kind === 'branch').length} branches)`
                                            : 'Not loaded'}
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Findings</DescriptionListTerm>
                                    <DescriptionListDescription>{findings}</DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Last scan</DescriptionListTerm>
                                    <DescriptionListDescription>{formatScanDate(scanInfo?.scannedAt)} UTC</DescriptionListDescription>
                                </DescriptionListGroup>
                                {grypeVersion && (
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>Scanner</DescriptionListTerm>
                                        <DescriptionListDescription>grype {grypeVersion}</DescriptionListDescription>
                                    </DescriptionListGroup>
                                )}
                                {latestRun?.runUrl && (
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>Latest run</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            <ExternalLink href={latestRun.runUrl}>{latestRun.ref}</ExternalLink>
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                )}
                            </DescriptionList>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem md={6}>
                    <Card isFullHeight>
                        <CardTitle>How a scan runs</CardTitle>
                        <CardBody>
                            <Content component={ContentVariants.p}>
                                A nightly GitHub Actions workflow (<code>.github/workflows/scan.yml</code>) does
                                the work, one job per ref:
                            </Content>
                            <Content component={ContentVariants.ol} className="about-steps">
                                <Content component={ContentVariants.li}>
                                    <code>camel version list</code> gives the releases that are still supported;
                                    they become the tags and maintenance branches to scan, plus <code>main</code>.
                                </Content>
                                <Content component={ContentVariants.li}>
                                    The ref is cloned and <code>mvn dependency:tree</code> writes the runtime
                                    dependencies of every Camel module.
                                </Content>
                                <Content component={ContentVariants.li}>
                                    grype scans the Camel SBOM and the matches are reshaped into one flat row per
                                    finding: coordinates, installed and fixed version, severity, EPSS and risk.
                                </Content>
                                <Content component={ContentVariants.li}>
                                    Results are committed under <code>public/data/&lt;ref&gt;/</code> together
                                    with a stamp saying when they were produced, from which Camel commit and by
                                    which grype version. A ref that fails keeps its previous data.
                                </Content>
                            </Content>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem md={6}>
                    <Card isFullHeight>
                        <CardTitle>How the browser reads it</CardTitle>
                        <CardBody>
                            <Content component={ContentVariants.p}>
                                Nothing is baked into the bundle, and the build ships no copy of the data
                                either. <code>CveApi</code> reads <code>public/data</code> of this repository
                                at runtime - on GitHub Pages straight off raw.githubusercontent.com - so a scan
                                that only commits data updates the dashboard with no rebuild and no redeploy.
                            </Content>
                            <List>
                                <ListItem>
                                    <code>data/scan.json</code> and <code>data/versions.json</code> say which refs
                                    exist and when each was scanned; the version selector on the CVE and component
                                    pages starts on the newest LTS release.
                                </ListItem>
                                <ListItem>
                                    Picking a ref loads its <code>vulnerabilities.json</code> into the Zustand
                                    store, which every page renders from.
                                </ListItem>
                                <ListItem>
                                    The dependency trees are an order of magnitude larger, so they are loaded only
                                    when a view needs them: <code>modules.json</code> indexes the
                                    per-module <code>mvn-tree.json</code> files, a bounded number are fetched in parallel,
                                    compacted to bare coordinates and memoised per ref.
                                </ListItem>
                            </List>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem md={6}>
                    <Card isFullHeight>
                        <CardTitle>Reading the pages</CardTitle>
                        <CardBody>
                            <DescriptionList isCompact>
                                {PAGES.map(page => (
                                    <DescriptionListGroup key={page.route}>
                                        <DescriptionListTerm>
                                            <Link to={page.route}>{page.name}</Link>
                                        </DescriptionListTerm>
                                        <DescriptionListDescription>{page.does}</DescriptionListDescription>
                                    </DescriptionListGroup>
                                ))}
                            </DescriptionList>
                        </CardBody>
                    </Card>
                </GridItem>
                <GridItem md={6}>
                    <Card isFullHeight>
                        <CardTitle>Scores and sources</CardTitle>
                        <CardBody>
                            <DescriptionList isCompact>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Severity</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        The severity grype reports for the advisory, from Critical down to
                                        Negligible; anything it cannot classify reads as Unknown.
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>EPSS</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        The Exploit Prediction Scoring System probability that the vulnerability
                                        is exploited in the wild within the next 30 days.
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Risk</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        The grype risk score, which weighs severity against that likelihood, so it
                                        ranks findings better than severity alone.
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Advisories</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        Every finding links back to the data source it came from — GitHub Security
                                        Advisories, the NVD or a distribution feed.
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                            </DescriptionList>
                        </CardBody>
                    </Card>
                </GridItem>
            </Grid>
        </div>
    );
};
