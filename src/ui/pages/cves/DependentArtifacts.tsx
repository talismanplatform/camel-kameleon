import React from 'react';
import {Badge} from '@patternfly/react-core/dist/esm/components/Badge';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {Tooltip} from '@patternfly/react-core/dist/esm/components/Tooltip';

/** Enough to see which part of Camel is affected without turning the tooltip into a page. */
const LISTED = 25;

interface DependentArtifactsProps {
    /** Camel artifacts whose dependency tree reaches the vulnerable dependency. */
    artifacts: string[];
    /** True while the module trees are still being fetched, so the count is not known yet. */
    isLoading?: boolean;
    /** False when the ref publishes no dependency trees at all. */
    isKnown?: boolean;
}

/**
 * How many Camel artifacts a finding reaches, and which ones. The count is the
 * cell, the artifacts are the tooltip; the drawer shows the paths that pull the
 * dependency in.
 */
export const DependentArtifacts: React.FunctionComponent<DependentArtifactsProps> = ({artifacts, isLoading, isKnown}) => {

    if (isLoading) {
        return <Spinner size="sm" aria-label="Loading dependent artifacts"/>;
    }

    if (!isKnown) {
        return <span className="cve-detail-empty">?</span>;
    }

    if (artifacts.length === 0) {
        return <span className="cve-detail-empty">0</span>;
    }

    const listed = artifacts.slice(0, LISTED);
    const rest = artifacts.length - listed.length;

    return (
        <Tooltip
            position="left"
            content={
                <div className="cve-dependents-tooltip">
                    {listed.map(artifact => <div key={artifact}>{artifact}</div>)}
                    {rest > 0 && <div className="cve-dependents-more">{`and ${rest} more`}</div>}
                </div>
            }
        >
            <span>
                <Badge screenReaderText={`${artifacts.length} dependent Camel artifacts`}>{artifacts.length}</Badge>
            </span>
        </Tooltip>
    );
};
