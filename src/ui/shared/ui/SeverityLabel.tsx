import React from 'react';
import {Label} from '@patternfly/react-core/dist/esm/components/Label';
import {Severity, SEVERITY_COLOR, SEVERITY_LABEL} from '@models/CveModels';

interface Props {
    severity: Severity;
    isCompact?: boolean;
}

export const SeverityLabel: React.FunctionComponent<Props> = ({severity, isCompact}) => (
    <Label color={SEVERITY_COLOR[severity]} isCompact={isCompact}>
        {SEVERITY_LABEL[severity]}
    </Label>
);
