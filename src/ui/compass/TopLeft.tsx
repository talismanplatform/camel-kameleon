import React from 'react';
import {Brand} from "@patternfly/react-core/dist/esm/components/Brand";
import logo from '@shared/icons/camel-logo.svg';
import "./TopLeft.css"
import {Content} from "@patternfly/react-core/dist/esm/components/Content";
import {PanelMain, PanelMainBody} from "@patternfly/react-core/dist/esm/components/Panel";
import {CompassNavContent, CompassNavMain} from "@patternfly/react-core/dist/esm/components/Compass";

export const TopLeft: React.FunctionComponent = () => {

    return (
        <div className="top-panel">
            <PanelMain>
                <PanelMainBody>
                    <CompassNavContent>
                        <CompassNavMain>
                            <div className="brand-logo">
                                <Brand src={logo} alt="Apache Camel" heights={{default: '32px'}} widths={{default: '32px'}}/>
                                <Content component={"h6"}>Kameleon 0.1.0</Content>
                            </div>
                        </CompassNavMain>
                    </CompassNavContent>
                </PanelMainBody>
            </PanelMain>
        </div>
    );
};
