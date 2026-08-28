import {create} from 'zustand';
import {CveApi} from '@api/CveApi';
import {ALL_REFS, CamelComponent, Cve, CveSummary, DependencyTrees, ScanInfo, ScanSeverity, VersionScan, Vulnerability} from '@models/CveModels';

export interface VulnerabilityFilters {
    search: string;
    severities: ScanSeverity[];
}

export const EMPTY_FILTERS: VulnerabilityFilters = {search: '', severities: []};

interface CveState {
    cves: Cve[];
    summary?: CveSummary;
    components: CamelComponent[];
    versions: VersionScan[];
    /**
     * Advisories against `org.apache.camel` artifacts per scanner severity, over
     * every scanned ref. Undefined until the first fetch, or when it failed.
     */
    camelBySeverity?: Record<ScanSeverity, number>;
    scanInfo?: ScanInfo;
    loading: boolean;
    error?: string;
    filters: VulnerabilityFilters;
    /** Ref whose `vulnerabilities.json` is currently shown, e.g. camel-4.22.0 */
    selectedRef?: string;
    vulnerabilities: Vulnerability[];
    vulnerabilitiesLoading: boolean;
    /** Module dependency trees of `selectedRef`, loaded on demand by the details drawer. */
    dependencyTrees?: DependencyTrees;
    /** Ref the trees were requested for, so an in flight load is not started twice. */
    dependencyTreesRef?: string;
    dependencyTreesLoading: boolean;

    fetchAll: () => Promise<void>;
    selectRef: (ref: string) => Promise<void>;
    loadDependencyTrees: () => Promise<void>;
    setFilters: (filters: Partial<VulnerabilityFilters>) => void;
    resetFilters: () => void;
}

export const useCveStore = create<CveState>((set, get) => ({
    cves: [],
    summary: undefined,
    components: [],
    versions: [],
    camelBySeverity: undefined,
    scanInfo: undefined,
    loading: false,
    error: undefined,
    filters: EMPTY_FILTERS,
    selectedRef: undefined,
    vulnerabilities: [],
    vulnerabilitiesLoading: false,
    dependencyTrees: undefined,
    dependencyTreesRef: undefined,
    dependencyTreesLoading: false,

    fetchAll: async () => {
        set({loading: true, error: undefined});
        try {
            const [cves, summary, components, versions, camelBySeverity, scanInfo] = await Promise.all([
                CveApi.getCves(),
                CveApi.getSummary(),
                CveApi.getComponents(),
                // Missing scan data must not blank the whole dashboard.
                CveApi.getVersions().catch(() => []),
                CveApi.getCamelSeverityCounts().catch(() => undefined),
                CveApi.getScanInfo().catch(() => undefined),
            ]);
            set({cves, summary, components, versions, camelBySeverity, scanInfo, loading: false});
        } catch (error) {
            set({loading: false, error: error instanceof Error ? error.message : String(error)});
        }
    },

    /** Loads the report of one ref. The last requested ref wins if two loads overlap. */
    selectRef: async (ref) => {
        set({
            selectedRef: ref,
            vulnerabilities: [],
            vulnerabilitiesLoading: true,
            // The trees of the previous ref say nothing about this one.
            dependencyTrees: undefined,
            dependencyTreesRef: undefined,
            dependencyTreesLoading: false,
        });
        const vulnerabilities = await CveApi.getVulnerabilities(ref);
        if (get().selectedRef === ref) {
            set({vulnerabilities, vulnerabilitiesLoading: false});
        }
    },

    /**
     * Loads the module trees of the selected ref once. They are an order of
     * magnitude larger than the report, so nothing fetches them until a drawer
     * asks where a finding comes from.
     */
    loadDependencyTrees: async () => {
        const ref = get().selectedRef;
        // `all` is not a ref on disk, and no single tree describes every version.
        if (!ref || ref === ALL_REFS || get().dependencyTreesRef === ref) {
            return;
        }
        set({dependencyTreesRef: ref, dependencyTrees: undefined, dependencyTreesLoading: true});
        const dependencyTrees = await CveApi.getDependencyTrees(ref).catch(() => undefined);
        if (get().dependencyTreesRef === ref) {
            set({dependencyTrees, dependencyTreesLoading: false});
        }
    },

    setFilters: (filters) => set({filters: {...get().filters, ...filters}}),
    resetFilters: () => set({filters: EMPTY_FILTERS}),
}));

/** Applies the active filters. Kept outside the store so it can be reused by any page. */
export function filterVulnerabilities(vulnerabilities: Vulnerability[], filters: VulnerabilityFilters): Vulnerability[] {
    const search = filters.search.trim().toLowerCase();
    return vulnerabilities.filter(vulnerability => {
        if (filters.severities.length > 0 && !filters.severities.includes(vulnerability.severity as ScanSeverity)) {
            return false;
        }
        if (search.length > 0) {
            const haystack = [
                vulnerability.vulnerability,
                vulnerability.groupId,
                vulnerability.artifactId,
                vulnerability.name,
                vulnerability.description,
            ].join(' ').toLowerCase();
            return haystack.includes(search);
        }
        return true;
    });
}
