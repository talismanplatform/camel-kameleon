import React from 'react';
import {CompassNavContent, CompassNavMain} from '@patternfly/react-core/dist/esm/components/Compass';
import {Panel, PanelMain, PanelMainBody} from '@patternfly/react-core/dist/esm/components/Panel';
import {shallow} from 'zustand/shallow';
import {useCompassStore} from './useCompassStore';
import {Divider} from "@patternfly/react-core/dist/esm/components/Divider";
import DarkModeToggle from "@compass/theme/DarkModeToggle";

export const TopRight: React.FunctionComponent = () => {

    const [pageNav, pageTools] = useCompassStore((s) => [s.pageNav, s.pageTools], shallow);

    return (
        <Panel isPill className="top-panel">
            <PanelMain>
                <PanelMainBody>
                    <CompassNavContent>
                        <CompassNavMain>
                            {pageNav}
                        </CompassNavMain>
                        <CompassNavMain>
                            <div className="app-nav-tools">
                                {pageTools}
                                <Divider orientation={{default: 'vertical'}}/>
                                <DarkModeToggle/>
                            </div>
                        </CompassNavMain>
                    </CompassNavContent>
                </PanelMainBody>
            </PanelMain>
        </Panel>
    );
};
