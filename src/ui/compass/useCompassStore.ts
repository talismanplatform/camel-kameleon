import React from 'react';
import {create} from 'zustand';

interface CompassState {
    isDrawerExpanded: boolean;

    // Page level chrome injected by the currently mounted page
    pageTitle: React.ReactNode;
    pageNav: React.ReactNode;
    pageTools: React.ReactNode;
    drawerPanel: React.ReactNode;

    setIsDrawerExpanded: (isDrawerExpanded: boolean) => void;

    setPageContext: (title: React.ReactNode, nav: React.ReactNode, tools: React.ReactNode, drawerPanel: React.ReactNode) => void;
    setDrawerPanel: (drawerPanel: React.ReactNode) => void;
}

export const useCompassStore = create<CompassState>((set) => ({
    isDrawerExpanded: false,

    pageTitle: null,
    pageNav: null,
    pageTools: null,
    drawerPanel: null,

    setIsDrawerExpanded: (isDrawerExpanded) => set({isDrawerExpanded}),

    setPageContext: (pageTitle, pageNav, pageTools, drawerPanel) => set({pageTitle, pageNav, pageTools, drawerPanel}),
    setDrawerPanel: (drawerPanel) => set({drawerPanel}),
}));
