import React from 'react';
import {useNavigate} from 'react-router-dom';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {Card, CardBody, CardFooter, CardTitle} from '@patternfly/react-core/dist/esm/components/Card';
import {Content, ContentVariants} from '@patternfly/react-core/dist/esm/components/Content';
import {DescriptionList, DescriptionListDescription, DescriptionListGroup, DescriptionListTerm} from '@patternfly/react-core/dist/esm/components/DescriptionList';
import {Label} from '@patternfly/react-core/dist/esm/components/Label';
import {Progress, ProgressMeasureLocation, ProgressVariant} from '@patternfly/react-core/dist/esm/components/Progress';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Gallery} from '@patternfly/react-core/dist/esm/layouts/Gallery';
import {Table, Tbody, Td, Th, Thead, Tr} from '@patternfly/react-table';
import {Grid, GridItem} from '@patternfly/react-core/dist/esm/layouts/Grid';
import {Flex, FlexItem} from '@patternfly/react-core/dist/esm/layouts/Flex';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import ArrowRightIcon from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon';
import CodeBranchIcon from '@patternfly/react-icons/dist/esm/icons/code-branch-icon';
import TagIcon from '@patternfly/react-icons/dist/esm/icons/tag-icon';
import {isOpen, ScanSeverity, SEVERITIES, Severity, SEVERITY_LABEL} from '@models/CveModels';
import {useCveStore} from '@stores/useCveStore';
import {ROUTES} from '@compass/navigation/Routes';
import {usePageContext} from '@compass/usePageContext';
import {EpssHeader, EpssScore, RiskHeader, RiskScore} from '@shared/ui/ScoreInfo';
import {SeverityLabel} from '@shared/ui/SeverityLabel';
import {StatusLabel} from '@shared/ui/StatusLabel';
import './DashboardPage.css';
import {LastScanDate} from "@shared/ui/LastScanDate";
import {sortedVersions} from '@shared/versionOrder';

/** The advisory severities of this page map onto the scanner severities the CVE page filters by. */
const SCAN_SEVERITY_OF: Record<Severity, ScanSeverity> = {
    critical: 'Critical',
    important: 'High',
    moderate: 'Medium',
    low: 'Low',
};

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

    const coverage = sortedVersions(versions);


    function showSeverity(severity: Severity) {
        setFilters({severities: [SCAN_SEVERITY_OF[severity]], search: ''});
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
                    <Card isFullHeight isCompact>
                        <CardBody>
                            <Table aria-label="Risk and EPSS per scanned version" variant="compact" className="coverage-table">
                                <Thead>
                                    <Tr>
                                        <Th>
                                            <Content component={'h6'}>Scan coverage</Content>
                                        </Th>
                                        <Th textCenter modifier="fitContent"><RiskHeader/></Th>
                                        <Th textCenter modifier="fitContent"><EpssHeader/></Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {coverage.map(version => (
                                        <Tr key={version.ref} style={{verticalAlign: 'middle'}}>
                                            <Td dataLabel="Version" modifier="nowrap">
                                                <Label variant="outline" isCompact
                                                       icon={version.kind === 'tag' ? <TagIcon/> : <CodeBranchIcon/>}>
                                                    {version.ref}
                                                </Label>
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
                    <Card isFullHeight isCompact>
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
                    <Card isFullHeight isCompact>
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
