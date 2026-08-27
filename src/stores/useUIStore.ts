import {shallow} from 'zustand/shallow';
import {createWithEqualityFn} from 'zustand/traditional';

interface UIState {
    /** Id of the dock menu entry that is currently highlighted. */
    pageId: string;
    setPageId: (pageId: string) => void;
}

export const useUIStore = createWithEqualityFn<UIState>((set) => ({
    pageId: 'dashboard',
    setPageId: (pageId) => set({pageId}),
}), shallow);
