import React from 'react';
import {CompassContent, CompassHeader} from '@patternfly/react-core/dist/esm/components/Compass';
import {Panel, PanelMain, PanelMainBody} from '@patternfly/react-core/dist/esm/components/Panel';
import {MainRoutes} from './navigation/MainRoutes';
import {AppNavigation} from './AppNavigation';
import {AppFooter} from './AppFooter';
import './AppMain.css';

export const AppMain: React.FunctionComponent = () => {
    return (
        <>
            <CompassHeader logo={<AppNavigation/>}/>
            <CompassContent>
                <Panel isScrollable isAutoHeight isGlass className="app-main-panel">
                    <PanelMain className="app-main-panel-main">
                        <PanelMainBody className="app-main-panel-body">
                            <MainRoutes/>
                        </PanelMainBody>
                    </PanelMain>
                </Panel>
            </CompassContent>
            <AppFooter/>
        </>
    );
};
