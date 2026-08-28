import React from 'react';
import {useNavigate} from 'react-router-dom';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {Card, CardBody, CardFooter, CardTitle} from '@patternfly/react-core/dist/esm/components/Card';
import {Content, ContentVariants} from '@patternfly/react-core/dist/esm/components/Content';
import {DescriptionList, DescriptionListDescription, DescriptionListGroup, DescriptionListTerm} from '@patternfly/react-core/dist/esm/components/DescriptionList';
import {Divider} from '@patternfly/react-core/dist/esm/components/Divider';
import {Label} from '@patternfly/react-core/dist/esm/components/Label';
import {Progress, ProgressMeasureLocation, ProgressVariant} from '@patternfly/react-core/dist/esm/components/Progress';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Gallery} from '@patternfly/react-core/dist/esm/layouts/Gallery';
import {Grid, GridItem} from '@patternfly/react-core/dist/esm/layouts/Grid';
import {Flex, FlexItem} from '@patternfly/react-core/dist/esm/layouts/Flex';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import ArrowRightIcon from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon';
import CodeBranchIcon from '@patternfly/react-icons/dist/esm/icons/code-branch-icon';
import TagIcon from '@patternfly/react-icons/dist/esm/icons/tag-icon';
import {isOpen, SEVERITIES, Severity, SEVERITY_LABEL, VersionScan} from '@models/CveModels';
import {useCveStore} from '@stores/useCveStore';
import {ROUTES} from '@compass/navigation/Routes';
import {usePageContext} from '@compass/usePageContext';
import {EpssHeader, EpssScore, RiskHeader, RiskScore} from '@shared/ui/ScoreInfo';
import {SeverityLabel} from '@shared/ui/SeverityLabel';
import {StatusLabel} from '@shared/ui/StatusLabel';
import './DashboardPage.css';
import {LastScanDate} from "@shared/ui/LastScanDate";

const SEVERITY_VARIANT: Record<Severity, ProgressVariant | undefined> = {
    critical: ProgressVariant.danger,
    important: ProgressVariant.warning,
    moderate: ProgressVariant.warning,
    low: ProgressVariant.success,
};

export const DashboardPage: React.FunctionComponent = () => {

    const navigate = useNavigate();
    const cves = useCveStore((s) => s.cves);
    const versions = useCveStore((s) => s.versions);
    const summary = useCveStore((s) => s.summary);
    const components = useCveStore((s) => s.components);
    const loading = useCveStore((s) => s.loading);
    const setFilters = useCveStore((s) => s.setFilters);

    usePageContext(
        'Security overview',
        <Title headingLevel="h1" size="xl">Apache Camel CVE Dashboard</Title>,
        <LastScanDate/>,
        [loading]
    );

    if (loading && cves.length === 0) {
        return <Bullseye><Spinner aria-label="Loading vulnerabilities"/></Bullseye>;
    }

    const openCves = cves.filter(isOpen);
    const topComponents = [...components].sort((a, b) => b.cveCount - a.cveCount).slice(0, 6);
    const latest = [...cves].sort((a, b) => b.published.localeCompare(a.published)).slice(0, 5);

    const scanned = versions.filter(version => version.loaded);
    const branches = versions.filter(version => version.kind === 'branch');
    const tags = versions.filter(version => version.kind === 'tag');
    const findings = scanned.reduce((total, version) => total + version.total, 0);
    const riskiest = worstBy(scanned, version => version.maxRisk);
    const mostExploitable = worstBy(scanned, version => version.maxEpss);


    function showSeverity(severity: Severity) {
        setFilters({severities: [severity], onlyOpen: false});
        navigate(ROUTES.CVES);
    }

    return (
        <div className="page-section dashboard-page">
            <Gallery hasGutter minWidths={{default: '220px'}}>
                {SEVERITIES.map(severity => (
                    <Card key={severity} isClickable isCompact className="stat-card">
                        <CardTitle>
                            <Flex justifyContent={{default: 'justifyContentSpaceBetween'}} alignItems={{default: 'alignItemsCenter'}}>
                                <FlexItem><SeverityLabel severity={severity}/></FlexItem>
                                <FlexItem>
                                    <span className="stat-card-value">{summary?.bySeverity[severity] ?? 0}</span>
                                </FlexItem>
                            </Flex>
                        </CardTitle>
                        <CardBody>
                            <Content component={ContentVariants.small}>
                                {SEVERITY_LABEL[severity]} severity advisories affecting Apache Camel
                            </Content>
                        </CardBody>
                        <CardFooter>
                            <Button variant="link" isInline icon={<ArrowRightIcon/>} iconPosition="end"
                                    onClick={() => showSeverity(severity)}>
                                View CVEs
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </Gallery>

            <Grid hasGutter className="dashboard-grid">
                <GridItem md={6} lg={4}>
                    <Card isFullHeight>
                        <CardTitle>Scan coverage</CardTitle>
                        <CardBody>
                            <DescriptionList isCompact isHorizontal>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Scanned refs</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        <Flex gap={{default: 'gapSm'}} alignItems={{default: 'alignItemsCenter'}}>
                                            <FlexItem>
                                                <Label variant="outline" isCompact icon={<CodeBranchIcon/>}>
                                                    {`${branches.length} branches`}
                                                </Label>
                                            </FlexItem>
                                            <FlexItem>
                                                <Label variant="outline" isCompact icon={<TagIcon/>}>
                                                    {`${tags.length} tags`}
                                                </Label>
                                            </FlexItem>
                                        </Flex>
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Findings</DescriptionListTerm>
                                    <DescriptionListDescription>{findings}</DescriptionListDescription>
                                </DescriptionListGroup>
                            </DescriptionList>
                            <Divider className="dashboard-divider"/>
                            <DescriptionList isCompact isHorizontal>
                                <DescriptionListGroup>
                                    <DescriptionListTerm><RiskHeader/></DescriptionListTerm>
                                    <DescriptionListDescription>
                                        <TopScore versionRef={riskiest?.ref} score={<RiskScore value={riskiest?.maxRisk}/>}/>
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm><EpssHeader/></DescriptionListTerm>
                                    <DescriptionListDescription>
                                        <TopScore versionRef={mostExploitable?.ref} score={<EpssScore value={mostExploitable?.maxEpss}/>}/>
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                            </DescriptionList>
                        </CardBody>
                        <CardFooter>
                            <Button variant="link" isInline icon={<ArrowRightIcon/>} iconPosition="end"
                                    onClick={() => navigate(ROUTES.VERSIONS)}>
                                All scanned versions
                            </Button>
                        </CardFooter>
                    </Card>
                </GridItem>

                <GridItem md={6} lg={4}>
                    <Card isFullHeight>
                        <CardTitle>Severity distribution</CardTitle>
                        <CardBody>
                            {SEVERITIES.map(severity => (
                                <Progress
                                    key={severity}
                                    className="severity-progress"
                                    value={summary && summary.total > 0 ? ((summary.bySeverity[severity] ?? 0) / summary.total) * 100 : 0}
                                    title={SEVERITY_LABEL[severity]}
                                    measureLocation={ProgressMeasureLocation.outside}
                                    label={`${summary?.bySeverity[severity] ?? 0}`}
                                    variant={SEVERITY_VARIANT[severity]}
                                />
                            ))}
                        </CardBody>
                    </Card>
                </GridItem>

                <GridItem md={12} lg={4}>
                    <Card isFullHeight>
                        <CardTitle>Most affected components</CardTitle>
                        <CardBody>
                            <DescriptionList isCompact>
                                {topComponents.map(component => (
                                    <DescriptionListGroup key={component.artifactId}>
                                        <DescriptionListTerm>{component.artifactId}</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            <Flex gap={{default: 'gapSm'}} alignItems={{default: 'alignItemsCenter'}}>
                                                <FlexItem>{component.cveCount} CVEs</FlexItem>
                                                {component.highestSeverity !== 'none' && (
                                                    <FlexItem><SeverityLabel severity={component.highestSeverity} isCompact/></FlexItem>
                                                )}
                                            </Flex>
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                ))}
                            </DescriptionList>
                        </CardBody>
                        <CardFooter>
                            <Button variant="link" isInline icon={<ArrowRightIcon/>} iconPosition="end"
                                    onClick={() => navigate(ROUTES.COMPONENTS)}>
                                All components
                            </Button>
                        </CardFooter>
                    </Card>
                </GridItem>

                <GridItem span={12}>
                    <Card>
                        <CardTitle>Latest advisories</CardTitle>
                        <CardBody>
                            <DescriptionList isCompact>
                                {latest.map(cve => (
                                    <DescriptionListGroup key={cve.cveId}>
                                        <DescriptionListTerm>
                                            <Button variant="link" isInline onClick={() => navigate(`/cves/${cve.cveId}`)}>
                                                {cve.cveId}
                                            </Button>
                                        </DescriptionListTerm>
                                        <DescriptionListDescription>
                                            <Flex gap={{default: 'gapSm'}} alignItems={{default: 'alignItemsCenter'}}>
                                                <FlexItem><SeverityLabel severity={cve.severity} isCompact/></FlexItem>
                                                <FlexItem><StatusLabel status={cve.status} isCompact/></FlexItem>
                                                <FlexItem>{cve.title}</FlexItem>
                                            </Flex>
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                ))}
                            </DescriptionList>
                        </CardBody>
                        <CardFooter>
                            <Button variant="link" isInline icon={<ArrowRightIcon/>} iconPosition="end"
                                    onClick={() => navigate(ROUTES.CVES)}>
                                {`Browse all ${openCves.length} open findings`}
                            </Button>
                        </CardFooter>
                    </Card>
                </GridItem>
            </Grid>
        </div>
    );
};

/** A score with the ref that carries it, so the worst value is attributable. */
const TopScore: React.FunctionComponent<{ versionRef?: string, score: React.ReactNode }> = ({versionRef, score}) => (
    <Flex gap={{default: 'gapSm'}} alignItems={{default: 'alignItemsCenter'}}>
        <FlexItem>{score}</FlexItem>
        {versionRef && (
            <FlexItem>
                <Content component={ContentVariants.small}>{versionRef}</Content>
            </FlexItem>
        )}
    </Flex>
);

/** The scan with the highest value of `score`, undefined when none carries one. */
function worstBy(versions: VersionScan[], score: (version: VersionScan) => number | undefined): VersionScan | undefined {
    return versions
        .filter(version => score(version) !== undefined)
        .sort((a, b) => (score(b) ?? 0) - (score(a) ?? 0))[0];
}
