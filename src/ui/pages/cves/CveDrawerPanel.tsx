import React from 'react';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {Content, ContentVariants} from '@patternfly/react-core/dist/esm/components/Content';
import {DescriptionList, DescriptionListDescription, DescriptionListGroup, DescriptionListTerm} from '@patternfly/react-core/dist/esm/components/DescriptionList';
import {DrawerActions, DrawerCloseButton, DrawerHead, DrawerPanelBody, DrawerPanelContent} from '@patternfly/react-core/dist/esm/components/Drawer';
import {Label, LabelGroup} from '@patternfly/react-core/dist/esm/components/Label';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {Flex, FlexItem} from '@patternfly/react-core/dist/esm/layouts/Flex';
import ExternalLinkAltIcon from '@patternfly/react-icons/dist/esm/icons/external-link-alt-icon';
import BugIcon from '@patternfly/react-icons/dist/esm/icons/bug-icon';
import {Cve} from '@models/CveModels';
import {SeverityLabel} from '@shared/ui/SeverityLabel';
import {StatusLabel} from '@shared/ui/StatusLabel';

interface Props {
    cve: Cve;
    onClose: () => void;
}

/** Detail panel rendered inside the Compass drawer, so the table stays visible. */
export const CveDrawerPanel: React.FunctionComponent<Props> = ({cve, onClose}) => (
    <DrawerPanelContent isResizable defaultSize="520px" minSize="360px">
        <DrawerHead>
            <Flex direction={{default: 'column'}} gap={{default: 'gapSm'}}>
                <FlexItem>
                    <Title headingLevel="h2" size="lg">{cve.cveId}</Title>
                </FlexItem>
                <FlexItem>
                    <LabelGroup>
                        <SeverityLabel severity={cve.severity}/>
                        <StatusLabel status={cve.status}/>
                        <Label isCompact variant="outline">CVSS {cve.cvssScore}</Label>
                        {cve.exploitAvailable && <Label isCompact color="red" icon={<BugIcon/>}>Exploit known</Label>}
                    </LabelGroup>
                </FlexItem>
            </Flex>
            <DrawerActions>
                <DrawerCloseButton onClick={onClose}/>
            </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody>
            <Content component={ContentVariants.h4}>{cve.title}</Content>
            <Content component={ContentVariants.p}>{cve.description}</Content>
            <DescriptionList isCompact isHorizontal>
                <DescriptionListGroup>
                    <DescriptionListTerm>CVSS vector</DescriptionListTerm>
                    <DescriptionListDescription>{cve.cvssVector}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                    <DescriptionListTerm>Weakness</DescriptionListTerm>
                    <DescriptionListDescription>{cve.cwe}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                    <DescriptionListTerm>Published</DescriptionListTerm>
                    <DescriptionListDescription>{cve.published}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                    <DescriptionListTerm>Updated</DescriptionListTerm>
                    <DescriptionListDescription>{cve.updated}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                    <DescriptionListTerm>Components</DescriptionListTerm>
                    <DescriptionListDescription>
                        <LabelGroup>
                            {cve.components.map(component => <Label key={component} isCompact>{component}</Label>)}
                        </LabelGroup>
                    </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                    <DescriptionListTerm>Affected versions</DescriptionListTerm>
                    <DescriptionListDescription>
                        <LabelGroup>
                            {cve.affectedVersions.map(version => <Label key={version} isCompact color="orange">{version}</Label>)}
                        </LabelGroup>
                    </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                    <DescriptionListTerm>Fixed in</DescriptionListTerm>
                    <DescriptionListDescription>
                        {cve.fixedIn.length === 0
                            ? 'No fix released yet'
                            : (
                                <LabelGroup>
                                    {cve.fixedIn.map(version => <Label key={version} isCompact color="green">{version}</Label>)}
                                </LabelGroup>
                            )}
                    </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                    <DescriptionListTerm>References</DescriptionListTerm>
                    <DescriptionListDescription>
                        {cve.references.map(reference => (
                            <Button
                                key={reference}
                                variant="link"
                                isInline
                                component="a"
                                href={reference}
                                target="_blank"
                                rel="noopener noreferrer"
                                icon={<ExternalLinkAltIcon/>}
                                iconPosition="end"
                            >
                                {reference}
                            </Button>
                        ))}
                    </DescriptionListDescription>
                </DescriptionListGroup>
            </DescriptionList>
        </DrawerPanelBody>
    </DrawerPanelContent>
);
