import {create} from 'zustand';

interface UIState {
    /** Id of the dock menu entry that is currently highlighted. */
    pageId: string;
    setPageId: (pageId: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
    pageId: 'dashboard',
    setPageId: (pageId) => set({pageId}),
}));
