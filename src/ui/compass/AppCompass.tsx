import React, {useMemo} from 'react';
import {Compass} from '@patternfly/react-core/dist/esm/components/Compass';
import {Drawer, DrawerContent, DrawerContentBody} from '@patternfly/react-core/dist/esm/components/Drawer';
import {shallow} from 'zustand/shallow';
import {ErrorBoundaryWrapper} from '@shared/ui/ErrorBoundaryWrapper';
import {AppSideBar} from './AppSideBar';
import {AppMain} from './AppMain';
import {useCompassStore} from './useCompassStore';
import './AppCompass.css';
import {CompassHeader} from "@patternfly/react-core/src";
import {TopLeft} from "@compass/TopLeft";
import {TopMiddle} from "@compass/TopMiddle";
import {TopRight} from "@compass/TopRight";

const AppCompass: React.FunctionComponent = () => {

    const [
        isDrawerExpanded,
        drawerPanelContent,
    ] = useCompassStore((s) => [
        s.isDrawerExpanded,
        s.drawerPanel,
    ], shallow);

    // The dock and main areas never depend on props, so they are built once.
    const memoizedDock = useMemo(() => <AppSideBar/>, []);
    const memoizedMain = useMemo(() => <AppMain/>, []);
    const header = <CompassHeader logo={<TopLeft/>} nav={<TopMiddle/>} profile={<TopRight/>}/>
    // const footer = <AppFooter/>;

    return (
        <Drawer isExpanded={isDrawerExpanded} position="end" isPill onExpand={() => {}}>
            <DrawerContent panelContent={drawerPanelContent}>
                <DrawerContentBody>
                    <ErrorBoundaryWrapper onError={error => console.error(error)}>
                        <Compass
                            header={header}
                            sidebarStart={memoizedDock}
                            main={memoizedMain}
                            // footer={footer}
                        />
                    </ErrorBoundaryWrapper>
                </DrawerContentBody>
            </DrawerContent>
        </Drawer>
    );
};

export default AppCompass;
