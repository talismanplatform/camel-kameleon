import React from 'react';
import {CompassNavContent, CompassNavMain} from '@patternfly/react-core/dist/esm/components/Compass';
import {Divider} from '@patternfly/react-core/dist/esm/components/Divider';
import {Panel, PanelMain, PanelMainBody} from '@patternfly/react-core/dist/esm/components/Panel';
import {shallow} from 'zustand/shallow';
import DarkModeToggle from './theme/DarkModeToggle';
import {useCompassStore} from './useCompassStore';

export const AppNavigation: React.FunctionComponent = () => {

    const [pageNav, pageTools] = useCompassStore((s) => [s.pageNav, s.pageTools], shallow);

    return (
        <Panel isGlass>
            <PanelMain>
                <PanelMainBody>
                    <CompassNavContent className="app-nav-content">
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
