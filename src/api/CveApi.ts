import cvesJson from '@data/cves.json';
import releasesJson from '@data/releases.json';
import {CamelComponent, CamelRelease, Cve, CveSummary, isOpen, ScanInfo, SEVERITIES, Severity} from '@models/CveModels';

/**
 * Fixture backed API. Every method mirrors the shape of the REST endpoint that will
 * replace it, so only the body of these functions changes once a backend exists.
 */
const LATENCY_MS = 250;

/**
 * Scan metadata lives in `public/data/scan.json` and is refreshed by the nightly
 * workflow, so it is fetched at runtime rather than bundled: a data-only commit
 * updates the date without rebuilding the application.
 */
const SCAN_INFO_URL = `${import.meta.env.BASE_URL}data/scan.json`;

const CVES = cvesJson as Cve[];

/** Category is derived from the artifact name until the backend supplies it. */
function categoryOf(artifactId: string): string {
    if (artifactId === 'camel-core') {
        return 'Core';
    }
    if (/http|jetty|undertow|netty|servlet|platform-http/.test(artifactId)) {
        return 'HTTP';
    }
    if (/sql|jdbc|mongo|jpa/.test(artifactId)) {
        return 'Data';
    }
    if (/kafka|jms|amqp|avro/.test(artifactId)) {
        return 'Messaging';
    }
    if (/xml|xslt|zipfile|compress|attachments|file/.test(artifactId)) {
        return 'Transformation';
    }
    return 'Other';
}

function highestSeverity(cves: Cve[]): Severity | 'none' {
    return SEVERITIES.find(severity => cves.some(cve => cve.severity === severity)) ?? 'none';
}

function delayed<T>(value: T): Promise<T> {
    return new Promise(resolve => setTimeout(() => resolve(value), LATENCY_MS));
}

export const CveApi = {

    getCves(): Promise<Cve[]> {
        return delayed(CVES);
    },

    getSummary(): Promise<CveSummary> {
        const bySeverity = SEVERITIES.reduce((acc, severity) => {
            acc[severity] = CVES.filter(cve => cve.severity === severity).length;
            return acc;
        }, {} as Record<Severity, number>);

        const open = CVES.filter(isOpen).length;

        return delayed({
            total: CVES.length,
            open,
            fixed: CVES.length - open,
            bySeverity,
            withExploit: CVES.filter(cve => cve.exploitAvailable).length,
        });
    },

    /** Resolves to undefined when no scan has been published yet. */
    async getScanInfo(): Promise<ScanInfo | undefined> {
        const response = await fetch(SCAN_INFO_URL, {cache: 'no-cache'});
        if (!response.ok) {
            return undefined;
        }
        return await response.json() as ScanInfo;
    },

    getComponents(): Promise<CamelComponent[]> {
        const artifacts = [...new Set(CVES.flatMap(cve => cve.components))].sort();
        return delayed(artifacts.map(artifactId => {
            const affecting = CVES.filter(cve => cve.components.includes(artifactId));
            return {
                name: artifactId.replace(/^camel-/, ''),
                artifactId,
                category: categoryOf(artifactId),
                cveCount: affecting.length,
                highestSeverity: highestSeverity(affecting),
            };
        }));
    },

    getReleases(): Promise<CamelRelease[]> {
        const releases = releasesJson as Omit<CamelRelease, 'openCves' | 'fixedCves'>[];
        return delayed(releases.map(release => ({
            ...release,
            openCves: CVES.filter(cve => isOpen(cve) && cve.affectedVersions.some(range => sameStream(range, release.version))).length,
            fixedCves: CVES.filter(cve => cve.fixedIn.includes(release.version)).length,
        })));
    },
};

function sameStream(range: string, version: string): boolean {
    const stream = version.split('.').slice(0, 2).join('.');
    return range.split(' - ').some(bound => bound.trim().startsWith(stream));
}
