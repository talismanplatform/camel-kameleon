import React, {useEffect, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {Card, CardBody, CardFooter, CardTitle} from '@patternfly/react-core/dist/esm/components/Card';
import {Content, ContentVariants} from '@patternfly/react-core/dist/esm/components/Content';
import {DescriptionList, DescriptionListDescription, DescriptionListGroup, DescriptionListTerm} from '@patternfly/react-core/dist/esm/components/DescriptionList';
import {Label} from '@patternfly/react-core/dist/esm/components/Label';
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
import {isOpen, MODULE_GROUPS, SCAN_SEVERITIES, ScanSeverity, SEVERITIES, Severity, SEVERITY_LABEL, Vulnerability} from '@models/CveModels';
import {useCveStore} from '@stores/useCveStore';
import {ROUTES} from '@compass/navigation/Routes';
import {usePageContext} from '@compass/usePageContext';
import {EpssHeader, EpssScore, RiskHeader, RiskScore, Severity as SeverityText} from '@shared/ui/ScoreInfo';
import {SeverityLabel} from '@shared/ui/SeverityLabel';
import {StatusLabel} from '@shared/ui/StatusLabel';
import './DashboardPage.css';
import {defaultVersion, sortedVersions} from '@shared/versionOrder';
import {componentRows, findingIndex, topModules} from '../components/componentTree';
import {CardHeader} from "@patternfly/react-core/src";
import {Badge} from "@patternfly/react-core/dist/esm/components/Badge";
import {LastScanDate} from "@shared/ui/LastScanDate";
import {capitalize} from "@patternfly/react-core";

/** The advisory severities of this page map onto the scanner severities the CVE page filters by. */
const SCAN_SEVERITY_OF: Record<Severity, ScanSeverity> = {
    critical: 'Critical',
    important: 'High',
    moderate: 'Medium',
    low: 'Low',
};

/** Enough of the components table to triage on, without turning the card into a page. */
const TOP_MODULES = 7;

/** The findings the card ranks, few enough to read at a glance. */
const TOP_CVES = 7;

/** Severities the scanner does not recognise read as `Unknown`, as on the CVE page. */
function severityOf(severity: string): ScanSeverity {
    return SCAN_SEVERITIES.find(known => known.toLowerCase() === severity?.toLowerCase()) ?? 'Unknown';
}

/**
 * Dangerous means what the CVE page opens on: the highest risk first, EPSS then
 * severity breaking the ties. One row per advisory, the worst of its artifacts.
 */
function mostDangerous(vulnerabilities: Vulnerability[], count: number): Vulnerability[] {
    const worst = new Map<string, Vulnerability>();
    for (const vulnerability of vulnerabilities) {
        const kept = worst.get(vulnerability.vulnerability);
        if (!kept || rank(vulnerability) > rank(kept)) {
            worst.set(vulnerability.vulnerability, vulnerability);
        }
    }
    return [...worst.values()].sort((a, b) => rank(b) - rank(a)).slice(0, count);
}

/** Risk dominates, EPSS and severity only separate findings that score the same. */
function rank(vulnerability: Vulnerability): number {
    const risk = vulnerability.risk ?? -1;
    const epss = vulnerability.epss ?? 0;
    const severity = SCAN_SEVERITIES.length - SCAN_SEVERITIES.indexOf(severityOf(vulnerability.severity));
    return risk * 1000 + epss * 100 + severity;
}

export const DashboardPage: React.FunctionComponent = () => {

    const navigate = useNavigate();
    const cves = useCveStore((s) => s.cves);
    const versions = useCveStore((s) => s.versions);
    const summary = useCveStore((s) => s.summary);
    const loading = useCveStore((s) => s.loading);
    const setFilters = useCveStore((s) => s.setFilters);
    const selectedRef = useCveStore((s) => s.selectedRef);
    const selectRef = useCveStore((s) => s.selectRef);
    const vulnerabilities = useCveStore((s) => s.vulnerabilities);
    const vulnerabilitiesLoading = useCveStore((s) => s.vulnerabilitiesLoading);
    const dependencyTrees = useCveStore((s) => s.dependencyTrees);
    const dependencyTreesLoading = useCveStore((s) => s.dependencyTreesLoading);
    const loadDependencyTrees = useCveStore((s) => s.loadDependencyTrees);

    usePageContext(
        'Security overview',
        <Title headingLevel="h1" size="xl">Apache Camel CVE Dashboard</Title>,
        null,
        [loading]
    );

    // The card reads the same ref the components page opens on, and picks it if nothing else has.
    useEffect(() => {
        if (!selectedRef) {
            const ref = defaultVersion(versions);
            if (ref) {
                selectRef(ref);
            }
        }
    }, [versions]);

    useEffect(() => {
        loadDependencyTrees();
    }, [selectedRef]);

    /**
     * The worst modules of the selected ref, scored exactly as the components
     * page scores them: the findings of the module itself and of everything it
     * depends on, collapsed into one severity, risk and EPSS per module.
     */
    const worstModules = useMemo(() => {
        if (!dependencyTrees) {
            return [];
        }
        const index = findingIndex(vulnerabilities);
        const modules = MODULE_GROUPS.flatMap(group =>
            (dependencyTrees[group] ?? []).map(module => componentRows(module, index, group)));
        return topModules(modules, TOP_MODULES);
    }, [dependencyTrees, vulnerabilities]);

    /** The worst findings of the selected ref, ranked as the CVE page ranks them. */
    const dangerousCves = useMemo(() => mostDangerous(vulnerabilities, TOP_CVES), [vulnerabilities]);

    if (loading && cves.length === 0) {
        return <Bullseye><Spinner aria-label="Loading vulnerabilities"/></Bullseye>;
    }

    const openCves = cves.filter(isOpen);
    const latest = [...cves].sort((a, b) => b.published.localeCompare(a.published)).slice(0, 5);

    const coverage = sortedVersions(versions);
    const cvesLoading = vulnerabilitiesLoading && vulnerabilities.length === 0;
    const modulesLoading = dependencyTreesLoading || cvesLoading;


    /** A dangerous finding opens the CVE page filtered down to that advisory. */
    function showCve(vulnerability: Vulnerability) {
        setFilters({severities: [], search: vulnerability.vulnerability});
        navigate(ROUTES.CVES);
    }

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
                        <CardHeader>
                            <div className='dashboard-card-header'>
                                <CardTitle>Scan coverage</CardTitle>
                                <Label variant="outline" style={{gap: 6}}>
                                    <LastScanDate/>
                                </Label>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <Table aria-label="Risk and EPSS per scanned version" variant="compact" className="coverage-table">
                                <Thead>
                                    <Tr>
                                        <Th>Release | Branch</Th>
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
                        <CardHeader>
                            <div className='dashboard-card-header'>
                                <CardTitle>Most dangerous CVEs</CardTitle>
                                <Label variant="outline" style={{gap: 6}}>
                                    {selectedRef}
                                    <Badge>LTS</Badge>
                                </Label>
                            </div>
                        </CardHeader>
                        <CardBody>
                            {cvesLoading ? (
                                <Bullseye><Spinner size="lg" aria-label="Loading vulnerabilities"/></Bullseye>
                            ) : (
                                <Table aria-label="Most dangerous vulnerabilities" variant="compact" className="dangerous-table">
                                    <Thead>
                                        <Tr>
                                            <Th>
                                                <Content component={'h6'}>Vulnerability</Content>
                                            </Th>
                                            <Th modifier="fitContent">Severity</Th>
                                            <Th textCenter modifier="fitContent"><RiskHeader/></Th>
                                            <Th textCenter modifier="fitContent"><EpssHeader/></Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {dangerousCves.map(vulnerability => (
                                            <Tr key={vulnerability.vulnerability} isClickable
                                                style={{verticalAlign: 'middle'}}
                                                onRowClick={() => showCve(vulnerability)}>
                                                <Td dataLabel="Vulnerability" modifier="nowrap">
                                                    {vulnerability.vulnerability}
                                                </Td>
                                                <Td dataLabel="Severity" modifier="nowrap">
                                                    <SeverityText severity={capitalize(vulnerability.severity) as ScanSeverity}
                                                                  text={vulnerability.severity}/>
                                                </Td>
                                                <Td dataLabel="Risk" modifier="nowrap" textCenter>
                                                    <RiskScore value={vulnerability.risk ?? undefined}/>
                                                </Td>
                                                <Td dataLabel="EPSS" modifier="nowrap" textCenter>
                                                    <EpssScore value={vulnerability.epss ?? undefined}/>
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            )}
                        </CardBody>
                        <CardFooter>
                            <Button variant="link" isInline icon={<ArrowRightIcon/>} iconPosition="end"
                                    onClick={() => navigate(ROUTES.CVES)}>
                                All vulnerabilities
                            </Button>
                        </CardFooter>
                    </Card>
                </GridItem>

                <GridItem md={12} lg={4}>
                    <Card isFullHeight isCompact>
                        <CardHeader>
                            <div className='dashboard-card-header'>
                                <CardTitle>Most affected components</CardTitle>
                                <Label variant="outline" style={{gap: 6}}>
                                    {selectedRef}
                                    <Badge>LTS</Badge>
                                </Label>
                            </div>
                        </CardHeader>
                        <CardBody>
                            {modulesLoading ? (
                                <Bullseye><Spinner size="lg" aria-label="Loading modules"/></Bullseye>
                            ) : (
                                <Table aria-label="Riskiest Camel modules" variant="compact" className="modules-table">
                                    <Thead>
                                        <Tr>
                                            <Th>
                                                <Content component={'h6'}>Module</Content>
                                            </Th>
                                            <Th modifier="fitContent">Severity</Th>
                                            <Th textCenter modifier="fitContent"><RiskHeader/></Th>
                                            <Th textCenter modifier="fitContent"><EpssHeader/></Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {worstModules.map(({row, score}) => (
                                            <Tr key={row.key} style={{verticalAlign: 'middle'}}>
                                                <Td dataLabel="Module" modifier="truncate">{row.artifactId}</Td>
                                                <Td dataLabel="Severity" modifier="nowrap">
                                                    {score.severity
                                                        ? <SeverityText severity={score.severity} text={score.severity}/>
                                                        : '-'}
                                                </Td>
                                                <Td dataLabel="Risk" modifier="nowrap" textCenter>
                                                    <RiskScore value={score.risk}/>
                                                </Td>
                                                <Td dataLabel="EPSS" modifier="nowrap" textCenter>
                                                    <EpssScore value={score.epss}/>
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            )}
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
