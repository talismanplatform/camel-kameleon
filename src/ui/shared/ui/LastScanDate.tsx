import React from 'react';
import {RefScan} from '@models/CveModels';
import {formatScanAge, formatScanDate} from "@shared/scanDate";
import {Tooltip} from "@patternfly/react-core/dist/esm/components/Tooltip";
import {useCveStore} from "@stores/useCveStore";
import "./LastScanDate.css"

/** Tooltip body for the last scan date: every ref and when it was scanned. */
function scannedRefs({refs}: { refs?: RefScan[] }): React.ReactNode {
    if (!refs || refs.length === 0) {
        return 'No scan has been published yet';
    }
    return <>{refs.map(ref => <div key={ref.ref}>{`${ref.ref}: ${formatScanDate(ref.scannedAt)}`}</div>)}</>;
}

export const LastScanDate: React.FunctionComponent = () => {
    const scanInfo = useCveStore((s) => s.scanInfo);
    const scanAge = formatScanAge(scanInfo?.scannedAt);
    return (
        <Tooltip content={scannedRefs({refs: scanInfo?.refs})} position={"bottom"}>
            <div className="last-scan-label">
                <p>Last scan</p>
                {/*{formatScanDate(scanInfo?.scannedAt)}*/}
                {scanAge && <span className="scan-age">{scanAge}</span>}
            </div>
        </Tooltip>
    )
};
