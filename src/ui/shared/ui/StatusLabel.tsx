import React from 'react';
import {Label} from '@patternfly/react-core/dist/esm/components/Label';
import {CveStatus, STATUS_LABEL} from '@models/CveModels';

const STATUS_COLOR: Record<CveStatus, 'red' | 'green' | 'orange' | 'grey'> = {
    'affected': 'red',
    'fixed': 'green',
    'under-investigation': 'orange',
    'not-affected': 'grey',
};

interface Props {
    status: CveStatus;
    isCompact?: boolean;
}

export const StatusLabel: React.FunctionComponent<Props> = ({status, isCompact}) => (
    <Label color={STATUS_COLOR[status]} isCompact={isCompact} variant="outline">
        {STATUS_LABEL[status]}
    </Label>
);
