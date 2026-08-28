import {VersionScan} from '@models/CveModels';
import {compareVersions} from '@api/CveApi';

/** By name: `main` leads because it is the development branch, the rest descend. */
export function sortedVersions(versions: VersionScan[]): VersionScan[] {
    return [...versions].sort((a, b) => {
        if (a.ref === 'main' || b.ref === 'main') {
            return a.ref === 'main' ? (b.ref === 'main' ? 0 : -1) : 1;
        }
        return b.ref.localeCompare(a.ref);
    });
}

/**
 * The ref a version selector should start on: the newest LTS release, because that
 * is what most users run. Tags win over the maintenance branch of the same release
 * so the default points at something immutable. Falls back to the first ref in the
 * usual order when no LTS release is known.
 */
export function defaultVersion(versions: VersionScan[]): string | undefined {
    const lts = versions
        .filter(version => version.release?.kind === 'lts')
        .sort((a, b) => {
            const byVersion = compareVersions(a.release!.camelVersion, b.release!.camelVersion);
            return byVersion !== 0 ? byVersion : (a.kind === 'tag' ? 1 : -1);
        });
    return lts.pop()?.ref ?? sortedVersions(versions)[0]?.ref;
}
