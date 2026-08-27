import React, {useMemo} from 'react';
import {Compass} from '@patternfly/react-core/dist/esm/components/Compass';
import {Drawer, DrawerContent, DrawerContentBody} from '@patternfly/react-core/dist/esm/components/Drawer';
import {shallow} from 'zustand/shallow';
import {ErrorBoundaryWrapper} from '@shared/ui/ErrorBoundaryWrapper';
import {AppDock} from './AppDock';
import {AppMain} from './AppMain';
import {useCompassStore} from './useCompassStore';
import './AppCompass.css';

const AppCompass: React.FunctionComponent = () => {

    const [
        isDockExpanded,
        isDockTextExpanded,
        isDrawerExpanded,
        drawerPanelContent,
    ] = useCompassStore((s) => [
        s.isDockExpanded,
        s.isDockTextExpanded,
        s.isDrawerExpanded,
        s.drawerPanel,
    ], shallow);

    // The dock and main areas never depend on props, so they are built once.
    const memoizedDock = useMemo(() => <AppDock/>, []);
    const memoizedMain = useMemo(() => <AppMain/>, []);

    return (
        <Drawer isExpanded={isDrawerExpanded} position="end" isPill onExpand={() => {}}>
            <DrawerContent panelContent={drawerPanelContent}>
                <DrawerContentBody>
                    <ErrorBoundaryWrapper onError={error => console.error(error)}>
                        <Compass
                            className="camel-cve"
                            dock={memoizedDock}
                            isDockExpanded={isDockExpanded}
                            isDockTextExpanded={isDockTextExpanded}
                            main={memoizedMain}
                        />
                    </ErrorBoundaryWrapper>
                </DrawerContentBody>
            </DrawerContent>
        </Drawer>
    );
};

export default AppCompass;
