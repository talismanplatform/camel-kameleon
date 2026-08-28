import React from 'react';
import {CompassNavContent, CompassNavMain} from '@patternfly/react-core/dist/esm/components/Compass';
import {Panel, PanelMain, PanelMainBody} from '@patternfly/react-core/dist/esm/components/Panel';
import {useCompassStore} from './useCompassStore';
import {Divider} from "@patternfly/react-core/dist/esm/components/Divider";
import DarkModeToggle from "@compass/theme/DarkModeToggle";
import "./TopRight.css"

export const TopRight: React.FunctionComponent = () => {

    const pageTools = useCompassStore((s) => s.pageTools);
    const showDivider = pageTools !== undefined && pageTools !== null;
    return (
        <Panel isPill className="top-panel">
            <PanelMain>
                <PanelMainBody>
                    <CompassNavContent>
                        <CompassNavMain>
                            <div className="app-nav-tools">
                                {pageTools}
                                {showDivider && <Divider orientation={{default: 'vertical'}}/>}
                                <DarkModeToggle/>
                            </div>
                        </CompassNavMain>
                    </CompassNavContent>
                </PanelMainBody>
            </PanelMain>
        </Panel>
    );
};
