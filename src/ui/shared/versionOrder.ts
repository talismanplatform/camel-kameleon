import {VersionScan} from '@models/CveModels';

/** By name: `main` leads because it is the development branch, the rest descend. */
export function sortedVersions(versions: VersionScan[]): VersionScan[] {
    return [...versions].sort((a, b) => {
        if (a.ref === 'main' || b.ref === 'main') {
            return a.ref === 'main' ? (b.ref === 'main' ? 0 : -1) : 1;
        }
        return b.ref.localeCompare(a.ref);
    });
}
