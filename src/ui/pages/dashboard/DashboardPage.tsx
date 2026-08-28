import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {Card, CardBody, CardFooter, CardHeader, CardTitle} from '@patternfly/react-core/dist/esm/components/Card';
import {Content, ContentVariants} from '@patternfly/react-core/dist/esm/components/Content';
import {Label} from '@patternfly/react-core/dist/esm/components/Label';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Gallery} from '@patternfly/react-core/dist/esm/layouts/Gallery';
import {Table, Tbody, Td, Th, Thead, Tr} from '@patternfly/react-table';
import {Grid, GridItem} from '@patternfly/react-core/dist/esm/layouts/Grid';
import {Flex, FlexItem} from '@patternfly/react-core/dist/esm/layouts/Flex';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import ArrowRightIcon from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon';
import {ALL_REFS, MODULE_GROUPS, SCAN_SEVERITIES, ScanSeverity, scanSeverityOf, Vulnerability} from '@models/CveModels';
import {useCveStore} from '@stores/useCveStore';
import {ROUTES} from '@compass/navigation/Routes';
import {usePageContext} from '@compass/usePageContext';
import {useCompassStore} from '@compass/useCompassStore';
import {VulnerabilityDrawer} from '../cves/VulnerabilityDrawer';
import {EpssHeader, EpssScore, RiskHeader, RiskScore, Severity as SeverityText} from '@shared/ui/ScoreInfo';
import './DashboardPage.css';
import {defaultVersion, sortedVersions} from '@shared/versionOrder';
import {componentRows, findingIndex, topModules} from '../components/componentTree';
import {Badge} from "@patternfly/react-core/dist/esm/components/Badge";
import {capitalize, HelperText, HelperTextItem} from "@patternfly/react-core";
import CodeBranchIcon from "@patternfly/react-icons/dist/esm/icons/code-branch-icon";
import TagIcon from "@patternfly/react-icons/dist/esm/icons/tag-icon";
import {LastScanDate} from "@shared/ui/LastScanDate";
import {logoOf} from "@pages/cves/CvesPage";
import {CheckCircleIcon, InfoIcon} from "@patternfly/react-icons";

/**
 * The severities the stat cards break the Camel advisories down by: the four the
 * scanner ranks, worst first. `Negligible` and `Unknown` are not shown, no Camel
 * advisory carries them.
 */
const CARD_SEVERITIES: ScanSeverity[] = ['Critical', 'High', 'Medium', 'Low'];

/** Enough of the components table to triage on, without turning the card into a page. */
const TOP_MODULES = 10;

/** The findings the card ranks, few enough to read at a glance. */
const TOP_CVES = 7;

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
    const severity = SCAN_SEVERITIES.length - SCAN_SEVERITIES.indexOf(scanSeverityOf(vulnerability.severity));
    return risk * 1000 + epss * 100 + severity;
}

const DashboardPage: React.FunctionComponent = () => {

    const navigate = useNavigate();
    const cves = useCveStore((s) => s.cves);
    const versions = useCveStore((s) => s.versions);
    const camelVulnerabilities = useCveStore((s) => s.camelVulnerabilities);
    const loading = useCveStore((s) => s.loading);
    const selectedRef = useCveStore((s) => s.selectedRef);
    const selectRef = useCveStore((s) => s.selectRef);
    const vulnerabilities = useCveStore((s) => s.vulnerabilities);
    const vulnerabilitiesLoading = useCveStore((s) => s.vulnerabilitiesLoading);
    const dependencyTrees = useCveStore((s) => s.dependencyTrees);
    const dependencyTreesLoading = useCveStore((s) => s.dependencyTreesLoading);
    const loadDependencyTrees = useCveStore((s) => s.loadDependencyTrees);
    const setDrawerPanel = useCompassStore((s) => s.setDrawerPanel);
    const setIsDrawerExpanded = useCompassStore((s) => s.setIsDrawerExpanded);

    // The finding whose details the drawer shows, picked in a severity card or in the most dangerous CVEs card.
    const [selected, setSelected] = useState<Vulnerability>();

    usePageContext(
        'Security overview',
        <Title headingLevel="h1" size="xl">Apache Camel CVE Dashboard</Title>,
        null,
        [loading]
    );

    // The card reads the same ref the components page opens on, and picks it if nothing else has.
    useEffect(() => {
        // `all` carries no module trees, so these pages fall back to a real ref.
        if (!selectedRef || selectedRef === ALL_REFS) {
            const ref = defaultVersion(versions);
            if (ref) {
                selectRef(ref);
            }
        }
    }, [versions]);

    useEffect(() => {
        loadDependencyTrees();
    }, [selectedRef]);

    // A finding of another ref must not stay open once this one is shown.
    useEffect(() => {
        setSelected(undefined);
    }, [vulnerabilities]);

    const closeDrawer = useCallback(() => setSelected(undefined), []);

    // Declared after usePageContext so the panel survives a page context refresh.
    useEffect(() => {
        setDrawerPanel(selected ? <VulnerabilityDrawer vulnerability={selected} onClose={closeDrawer}/> : null);
        setIsDrawerExpanded(selected !== undefined);
    }, [selected]);

    // Leaving the page must not leave its drawer behind.
    useEffect(() => () => {
        setDrawerPanel(null);
        setIsDrawerExpanded(false);
    }, []);

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

    /**
     * The direct Camel advisories the stat cards list, grouped by the severity they
     * were reported with and ranked as the CVE page ranks them.
     */
    const camelBySeverity = useMemo(() => {
        const grouped = {} as Record<ScanSeverity, Vulnerability[]>;
        for (const severity of SCAN_SEVERITIES) {
            grouped[severity] = [];
        }
        for (const vulnerability of camelVulnerabilities) {
            grouped[scanSeverityOf(vulnerability.severity)].push(vulnerability);
        }
        for (const severity of SCAN_SEVERITIES) {
            grouped[severity].sort((a, b) => rank(b) - rank(a));
        }
        return grouped;
    }, [camelVulnerabilities]);

    /** The worst findings of the selected ref, ranked as the CVE page ranks them. */
    const dangerousCves = useMemo(() => mostDangerous(vulnerabilities, TOP_CVES), [vulnerabilities]);

    if (loading && cves.length === 0) {
        return <Bullseye><Spinner aria-label="Loading vulnerabilities"/></Bullseye>;
    }

    // const openCves = cves.filter(isOpen);
    // const latest = [...cves].sort((a, b) => b.published.localeCompare(a.published)).slice(0, 5);

    const coverage = sortedVersions(versions);
    const cvesLoading = vulnerabilitiesLoading && vulnerabilities.length === 0;
    const modulesLoading = dependencyTreesLoading || cvesLoading;


    return (
        <div className="page-section dashboard-page">

            <Card isFullHeight isCompact>
                <CardHeader>
                    <div className='dashboard-card-header'>
                        <CardTitle>Apache Camel advisories</CardTitle>
                        <HelperText className={'stat-card-note'}>
                            <HelperTextItem icon={<InfoIcon/>}>Direct advisories across all scanned versions (excluding dependencies)</HelperTextItem>
                        </HelperText>
                    </div>
                </CardHeader>
                <CardBody>
                    <Gallery hasGutter minWidths={{default: '20%'}}>
                        {CARD_SEVERITIES.map(severity => {
                            const num = camelBySeverity[severity].length;
                            const showNum = num > 0;
                            return (
                                <Card key={severity} variant="secondary" isCompact className="stat-card">
                                    <CardTitle>
                                        <Flex justifyContent={{default: 'justifyContentSpaceBetween'}} alignItems={{default: 'alignItemsCenter'}}>
                                            <FlexItem>
                                                <SeverityText severity={severity} text={`${severity} severity`} component={ContentVariants.h6}/>
                                            </FlexItem>
                                            <FlexItem>
                                                {showNum &&
                                                    <Label isCompact variant={'outline'}>
                                                        <SeverityText severity={severity} text={num} component={ContentVariants.h6}/>
                                                    </Label>
                                                }
                                                {!showNum && <CheckCircleIcon color={'var(--pf-t--global--color--status--success--default)'}/>}
                                            </FlexItem>
                                        </Flex>
                                    </CardTitle>
                                    <CardBody>
                                        {num === 0 ? (
                                            <span className="stat-card-empty">No advisories</span>
                                        ) : (
                                            <ul className="stat-card-cves" aria-label={`${severity} Apache Camel advisories`}>
                                                {camelBySeverity[severity].map(vulnerability => (
                                                    <li key={vulnerability.vulnerability}>
                                                        <Button variant="link" isInline
                                                                onClick={() => setSelected(vulnerability)}>
                                                            {vulnerability.vulnerability}
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </CardBody>
                                </Card>
                            )
                        })}
                    </Gallery>
                </CardBody>
                <CardFooter>

                </CardFooter>
            </Card>


            <Grid hasGutter className="dashboard-grid">
                <GridItem md={6} lg={4}>
                    <Card isFullHeight isCompact>
                        <CardHeader>
                            <div className='dashboard-card-header'>
                                <CardTitle>Most dangerous dependencies</CardTitle>
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
                                        {dangerousCves.map(vulnerability => {
                                            const logo = logoOf(vulnerability.groupId);
                                            return (
                                                <Tr key={vulnerability.vulnerability} isClickable
                                                    style={{verticalAlign: 'middle'}}
                                                    onRowClick={() => setSelected(vulnerability)}>
                                                    <Td dataLabel="Vulnerability">
                                                        <div style={{display: 'flex', alignItems: 'center', gap: '0.1rem', justifyContent: 'flex-start'}}>
                                                            <p>{vulnerability.vulnerability}</p>
                                                            {logo && <img className="cve-logo" src={logo.src} alt={logo.alt}/>}
                                                        </div>
                                                        <HelperText>
                                                            <HelperTextItem>{`${vulnerability.groupId}:${vulnerability.artifactId}`}</HelperTextItem>
                                                        </HelperText>
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
                                            )
                                        })}
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
                                                <div style={{display: 'flex', gap: 6, alignItems: 'center'}}>
                                                    {version.kind === 'tag' ? <TagIcon/> : <CodeBranchIcon/>}
                                                    {version.ref}
                                                    {version.kind === 'tag' && version.release?.kind === 'lts' && <Badge>LTS</Badge>}
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
                        </CardBody>
                        <CardFooter>
                            <Button variant="link" isInline icon={<ArrowRightIcon/>} iconPosition="end"
                                    onClick={() => navigate(ROUTES.VERSIONS)}>
                                All scanned versions
                            </Button>
                        </CardFooter>
                    </Card>
                </GridItem>
            </Grid>
        </div>
    );
};
export default DashboardPage
