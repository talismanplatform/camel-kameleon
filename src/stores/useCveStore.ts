import {create} from 'zustand';
import {CveApi} from '@api/CveApi';
import {CamelComponent, CamelRelease, Cve, CveSummary, Severity} from '@models/CveModels';

export interface CveFilters {
    search: string;
    severities: Severity[];
    onlyOpen: boolean;
}

export const EMPTY_FILTERS: CveFilters = {search: '', severities: [], onlyOpen: false};

interface CveState {
    cves: Cve[];
    summary?: CveSummary;
    components: CamelComponent[];
    releases: CamelRelease[];
    loading: boolean;
    error?: string;
    filters: CveFilters;
    selectedCveId?: string;

    fetchAll: () => Promise<void>;
    setFilters: (filters: Partial<CveFilters>) => void;
    resetFilters: () => void;
    selectCve: (cveId?: string) => void;
}

export const useCveStore = create<CveState>((set, get) => ({
    cves: [],
    summary: undefined,
    components: [],
    releases: [],
    loading: false,
    error: undefined,
    filters: EMPTY_FILTERS,
    selectedCveId: undefined,

    fetchAll: async () => {
        set({loading: true, error: undefined});
        try {
            const [cves, summary, components, releases] = await Promise.all([
                CveApi.getCves(),
                CveApi.getSummary(),
                CveApi.getComponents(),
                CveApi.getReleases(),
            ]);
            set({cves, summary, components, releases, loading: false});
        } catch (error) {
            set({loading: false, error: error instanceof Error ? error.message : String(error)});
        }
    },

    setFilters: (filters) => set({filters: {...get().filters, ...filters}}),
    resetFilters: () => set({filters: EMPTY_FILTERS}),
    selectCve: (selectedCveId) => set({selectedCveId}),
}));

/** Applies the active filters. Kept outside the store so it can be reused by any page. */
export function filterCves(cves: Cve[], filters: CveFilters): Cve[] {
    const search = filters.search.trim().toLowerCase();
    return cves.filter(cve => {
        if (filters.onlyOpen && (cve.status === 'fixed' || cve.status === 'not-affected')) {
            return false;
        }
        if (filters.severities.length > 0 && !filters.severities.includes(cve.severity)) {
            return false;
        }
        if (search.length > 0) {
            const haystack = [cve.cveId, cve.title, cve.description, ...cve.components].join(' ').toLowerCase();
            return haystack.includes(search);
        }
        return true;
    });
}
