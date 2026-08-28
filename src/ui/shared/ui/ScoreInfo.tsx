import React from 'react';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {Divider} from '@patternfly/react-core/dist/esm/components/Divider';
import {Popover} from '@patternfly/react-core/dist/esm/components/Popover';
import {SCAN_SEVERITY_COLOR, ScanSeverity} from "@models/CveModels";
import {Content, ContentVariants} from "@patternfly/react-core/dist/esm/components/Content";

/** PatternFly status tokens, so a score reads the same wherever it is shown. */
const GREY = 'var(--pf-t--global--color--severity--minor--100)';
const GREEN = 'var(--pf-t--global--text--color--status--success--default)';
const YELLOW = 'var(--pf-t--global--text--color--status--warning--default)';
const RED = 'var(--pf-t--global--text--color--status--danger--default)';
const SUBTLE = 'var(--pf-t--global--text--color--subtle)';

const column: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: 8};
const indented: React.CSSProperties = {...column, paddingLeft: 12};
const band: React.CSSProperties = {textWrap: 'nowrap'};

interface BandProps {
    color: string;
    title: string;
    children: React.ReactNode;
}

/** One coloured threshold band of a score legend. */
const Band: React.FunctionComponent<BandProps> = ({color, title, children}) => (
    <li>
        <div style={indented}>
            <strong style={{...band, color}}>{title}</strong>
            {children}
        </div>
    </li>
);

/** Column header explaining what EPSS is and how to read its colours. */
export const EpssHeader: React.FunctionComponent = () => (
    <Popover
        aria-label="EPSS explanation"
        headerContent={<div>EPSS</div>}
        bodyContent={
            <div style={column}>
                <div>
                    <a href="https://www.first.org/epss/" target="_blank" rel="noopener noreferrer">Exploit Prediction Scoring System</a>
                    {' '}score and percentile showing the probability of exploitation.
                </div>
                <Divider/>
                <div style={indented}>
                    <Band color={GREY} title="Grey (Low Threat): 0% to 1%">
                        The background noise of the internet. Hackers are not actively looking for this bug.
                    </Band>
                    <Band color={YELLOW} title="Yellow (Medium Threat): 1% to 10%">
                        Watch closely. There might be a public proof-of-concept (PoC) exploit script available, or minor
                        scanning activity has begun.
                    </Band>
                    <Band color={RED} title="Red (High Threat): 10% to 100%">
                        Critical real-world danger. A 10%+ probability in cybersecurity means the flaw is actively being
                        weaponised by automated botnets or malware campaigns in the wild.
                    </Band>
                </div>
            </div>
        }
    >
        <Button variant="link" isInline>EPSS</Button>
    </Popover>
);

/** Column header explaining how the risk score is composed and how to read its colours. */
export const RiskHeader: React.FunctionComponent = () => (
    <Popover
        aria-label="Risk explanation"
        headerContent={<div>Risk</div>}
        bodyContent={
            <div style={column}>
                <p>Calculated risk score combining CVSS, EPSS, and other severity metrics into a single numeric value
                    (0.0 to 10.0). The default risk score takes a holistic approach by combining:</p>
                <Divider/>
                <div style={indented}>
                    <li><strong>Threat (likelihood of exploitation)</strong>: Based on EPSS (Exploit Prediction Scoring
                        System) scores or presence in CISA&rsquo;s Known Exploited Vulnerabilities (KEV) catalog.
                    </li>
                    <li><strong>Impact (potential damage)</strong>: Based on CVSS scores and severity ratings from
                        multiple sources.
                    </li>
                    <li><strong>Context (exploitation evidence)</strong>: Additional weight for vulnerabilities with
                        known ransomware campaigns.
                    </li>
                </div>
                <div style={indented}>
                    <Band color={GREEN} title="Green (Low / Negligible): 0.0 to 3.9">
                        Safe to ignore or defer to regular maintenance cycles.
                    </Band>
                    <Band color={YELLOW} title="Yellow (Medium): 4.0 to 6.9">
                        Plan a patch during an upcoming sprint.
                    </Band>
                    <Band color={RED} title="Red (High / Critical): 7.0 to 10.0">
                        Immediate remediation or emergency patch required.
                    </Band>
                </div>
            </div>
        }
    >
        <Button variant="link" isInline>Risk</Button>
    </Popover>
);

interface SeverityProps {
    severity: ScanSeverity;
    count: number;
}


export const Severity: React.FunctionComponent<SeverityProps> = ({severity, count}) => (
    <Content component={ContentVariants.p} style={{color: SCAN_SEVERITY_COLOR[severity]}}>{count}</Content>
);

/** Risk bands: green below 4.0, yellow below 7.0, red above. */
function riskColor(value: number): string {
    if (value >= 7) {
        return RED;
    }
    return value >= 4 ? YELLOW : GREEN;
}

/** EPSS bands, on the 0..1 probability: grey below 1%, yellow below 10%, red above. */
function epssColor(value: number): string {
    if (value >= 0.1) {
        return RED;
    }
    return value >= 0.01 ? YELLOW : GREY;
}

interface ScoreProps {
    value?: number;
}

/** Grype risk score, one decimal, coloured by band. */
export const RiskScore: React.FunctionComponent<ScoreProps> = ({value}) => (
    value === undefined
        ? <span style={{color: SUBTLE}}>-</span>
        : <Content component={ContentVariants.p} style={{color: riskColor(value)}}>{value.toFixed(1)}</Content>
);

/** EPSS is a probability, so it reads best as a percentage. */
export const EpssScore: React.FunctionComponent<ScoreProps> = ({value}) => (
    value === undefined
        ? <span style={{color: SUBTLE}}>-</span>
        : <Content component={ContentVariants.p} style={{color: epssColor(value)}}>{`${(value * 100).toFixed(1)}%`}</Content>
);
