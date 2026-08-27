import React, {useEffect} from 'react';
import {useCompassStore} from './useCompassStore';

/**
 * Pages push their own title, navigation and tools into the Compass header instead of
 * rendering a header of their own, which keeps the shell in charge of the layout.
 */
export function usePageContext(
    title: React.ReactNode,
    nav: React.ReactNode,
    tools: React.ReactNode,
    deps: unknown[] = []
) {
    const setPageContext = useCompassStore((s) => s.setPageContext);

    useEffect(() => {
        setPageContext(title, nav, tools, null);
        return () => setPageContext(null, null, null, null);
    }, deps);
}
