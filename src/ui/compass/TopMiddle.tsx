import React from 'react';
import {CompassNavContent, CompassNavMain} from '@patternfly/react-core/dist/esm/components/Compass';
import {Panel, PanelMain, PanelMainBody} from '@patternfly/react-core/dist/esm/components/Panel';
import {shallow} from 'zustand/shallow';
import {useCompassStore} from './useCompassStore';

export const TopMiddle: React.FunctionComponent = () => {

    const [pageNav, pageTools] = useCompassStore((s) => [s.pageNav, s.pageTools], shallow);

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
