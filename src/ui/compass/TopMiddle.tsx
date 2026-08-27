import React from 'react';
import {CompassNavContent, CompassNavMain} from '@patternfly/react-core/dist/esm/components/Compass';
import {Panel, PanelMain, PanelMainBody} from '@patternfly/react-core/dist/esm/components/Panel';
import {useCompassStore} from './useCompassStore';

export const TopMiddle: React.FunctionComponent = () => {

    const pageNav = useCompassStore((s) => s.pageNav);

    return (
        <Panel isPill className="top-panel">
            <PanelMain>
                <PanelMainBody>
                    <CompassNavContent>
                        <CompassNavMain>
                            {pageNav}
                        </CompassNavMain>
                    </CompassNavContent>
                </PanelMainBody>
            </PanelMain>
        </Panel>
    );
};
