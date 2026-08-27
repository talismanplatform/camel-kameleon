import React from 'react';
import TachometerAltIcon from '@patternfly/react-icons/dist/esm/icons/tachometer-alt-icon';
import SecurityIcon from '@patternfly/react-icons/dist/esm/icons/security-icon';
import CubesIcon from '@patternfly/react-icons/dist/esm/icons/cubes-icon';
import CodeBranchIcon from '@patternfly/react-icons/dist/esm/icons/code-branch-icon';
import InfoCircleIcon from '@patternfly/react-icons/dist/esm/icons/info-circle-icon';
import {ROUTES} from './Routes';

export class MenuItem {
    pageId: string;
    name: string;
    to: string;
    icon: React.ReactNode;
    preview: boolean;

    constructor(pageId: string, name: string, to: string, icon: React.ReactNode, preview = false) {
        this.pageId = pageId;
        this.name = name;
        this.to = to;
        this.icon = icon;
        this.preview = preview;
    }
}

export function getNavigationFirstMenu(): MenuItem[] {
    return [
        new MenuItem('dashboard', 'Dashboard', ROUTES.DASHBOARD, <TachometerAltIcon/>),
        new MenuItem('cves', 'CVEs', ROUTES.CVES, <SecurityIcon/>),
        new MenuItem('components', 'Components', ROUTES.COMPONENTS, <CubesIcon/>),
        new MenuItem('releases', 'Releases', ROUTES.RELEASES, <CodeBranchIcon/>),
    ];
}

export function getNavigationSecondMenu(): MenuItem[] {
    return [
        new MenuItem('about', 'About', ROUTES.ABOUT, <InfoCircleIcon/>),
    ];
}
