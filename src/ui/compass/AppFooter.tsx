import React from 'react';
import {Badge} from '@patternfly/react-core/dist/esm/components/Badge';
import {CompassMainFooter} from '@patternfly/react-core/dist/esm/components/Compass';
import {Content, ContentVariants} from '@patternfly/react-core/dist/esm/components/Content';
import {Divider} from '@patternfly/react-core/dist/esm/components/Divider';
import {Panel, PanelMain, PanelMainBody} from '@patternfly/react-core/dist/esm/components/Panel';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {shallow} from 'zustand/shallow';
import {useCveStore} from '@stores/useCveStore';
import './AppFooter.css';

export const AppFooter: React.FunctionComponent = () => {

    const [summary, loading] = useCveStore((s) => [s.summary, s.loading], shallow);

    return (
        <CompassMainFooter className="app-footer">
            <Panel isGlass className="app-footer-panel">
                <PanelMain>
                    <PanelMainBody>
                        <div className="app-footer-content">
                            <Content component={ContentVariants.small}>Apache Camel CVE Dashboard</Content>
                            <Divider orientation={{default: 'vertical'}}/>
                            <Badge isRead>{summary ? `${summary.total} CVEs tracked` : 'loading'}</Badge>
                            <Badge isRead className={summary && summary.open > 0 ? 'open-cves' : ''}>
                                {summary ? `${summary.open} open` : '-'}
                            </Badge>
                            <Divider orientation={{default: 'vertical'}}/>
                            <Content component={ContentVariants.small}>
                                {summary ? `Last scan ${summary.lastScan}` : 'Scanning'}
                            </Content>
                            <div className="app-footer-spacer"/>
                            {loading && <Spinner size="sm" aria-label="Loading data"/>}
                            <Badge isRead>sample data</Badge>
                        </div>
                    </PanelMainBody>
                </PanelMain>
            </Panel>
        </CompassMainFooter>
    );
};
