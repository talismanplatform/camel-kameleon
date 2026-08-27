import React, {useEffect} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {Badge} from '@patternfly/react-core/dist/esm/components/Badge';
import {Nav, NavItem, NavList} from '@patternfly/react-core/dist/esm/components/Nav';
import {Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem} from '@patternfly/react-core/dist/esm/components/Toolbar';
import {useUIStore} from '@stores/useUIStore';
import {getNavigationFirstMenu, getNavigationSecondMenu, MenuItem} from './navigation/NavigationMenu';
import './AppSideBar.css';
import {Panel, PanelMain, PanelMainBody} from "@patternfly/react-core/dist/esm/components/Panel";

export const AppSideBar: React.FunctionComponent = () => {

    const {pageId, setPageId} = useUIStore();
    const navigate = useNavigate();
    const location = useLocation();

    const firstMenu = getNavigationFirstMenu();
    const secondMenu = getNavigationSecondMenu();

    // The dock highlight follows the URL, so deep links and the back button stay in sync.
    useEffect(() => {
        const page = location.pathname.split('/').filter(Boolean)[0];
        setPageId(page ?? 'dashboard');
    }, [location]);

    function onClick(item: MenuItem) {
        if (item.to.startsWith('http')) {
            window.open(item.to, '_blank', 'noopener,noreferrer');
            return;
        }
        setPageId(item.pageId);
        navigate(item.to);
    }

    function getMenu(menu: MenuItem[]) {
        return menu.map(menuItem => {
            const isSelected = pageId === menuItem.pageId;
            const navItem = (
                <NavItem
                    key={menuItem.pageId}
                    preventDefault
                    id={menuItem.pageId}
                    itemId={menuItem.pageId}
                    isActive={isSelected}
                    icon={menuItem.icon}
                    aria-label={menuItem.name}
                    onClick={() => onClick(menuItem)}
                >
                    {menuItem.name}
                </NavItem>
            );
            return (
                <div key={menuItem.pageId} className="nav-item-wrapper">
                    {navItem}
                    {menuItem.preview && <Badge className="nav-button-badge">Preview</Badge>}
                </div>
            );
        });
    }

    return (
        <Panel isPill className="app-panel">
            <PanelMain>
                <PanelMainBody>
                    <Toolbar id="dock-toolbar" isVertical>
                        <ToolbarContent>
                            <ToolbarItem>
                                <Nav variant="docked" aria-label="Main navigation" ouiaId="DockNavFirst">
                                    <NavList>
                                        {getMenu(firstMenu)}
                                    </NavList>
                                </Nav>
                            </ToolbarItem>
                            <ToolbarGroup
                                variant="action-group-plain"
                                align={{default: 'alignEnd'}}
                                gap={{default: 'gapNone', md: 'gapMd'}}
                            >
                                <ToolbarItem>
                                    <Nav variant="docked" aria-label="Secondary navigation" ouiaId="DockNavSecond">
                                        <NavList>
                                            {getMenu(secondMenu)}
                                        </NavList>
                                    </Nav>
                                </ToolbarItem>
                            </ToolbarGroup>
                        </ToolbarContent>
                    </Toolbar>
                </PanelMainBody>
            </PanelMain>
        </Panel>
    );
};
