import React from 'react';
import {shallow} from 'zustand/shallow';
import {createWithEqualityFn} from 'zustand/traditional';

interface CompassState {
    isDockExpanded: boolean;
    isDockTextExpanded: boolean;
    isDrawerExpanded: boolean;

    // Page level chrome injected by the currently mounted page
    pageTitle: React.ReactNode;
    pageNav: React.ReactNode;
    pageTools: React.ReactNode;
    drawerPanel: React.ReactNode;

    setIsDockExpanded: (isDockExpanded: boolean) => void;
    setIsDockTextExpanded: (isDockTextExpanded: boolean) => void;
    setIsDrawerExpanded: (isDrawerExpanded: boolean) => void;

    setPageContext: (title: React.ReactNode, nav: React.ReactNode, tools: React.ReactNode, drawerPanel: React.ReactNode) => void;
    setDrawerPanel: (drawerPanel: React.ReactNode) => void;
}

export const useCompassStore = createWithEqualityFn<CompassState>((set) => ({
    isDockExpanded: false,
    isDockTextExpanded: false,
    isDrawerExpanded: false,

    pageTitle: null,
    pageNav: null,
    pageTools: null,
    drawerPanel: null,

    setIsDockExpanded: (isDockExpanded) => set({isDockExpanded}),
    setIsDockTextExpanded: (isDockTextExpanded) => set({isDockTextExpanded}),
    setIsDrawerExpanded: (isDrawerExpanded) => set({isDrawerExpanded}),

    setPageContext: (pageTitle, pageNav, pageTools, drawerPanel) => set({pageTitle, pageNav, pageTools, drawerPanel}),
    setDrawerPanel: (drawerPanel) => set({drawerPanel}),
}), shallow);
