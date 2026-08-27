import React, {useEffect, useRef} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {Badge} from '@patternfly/react-core/dist/esm/components/Badge';
import {Brand} from '@patternfly/react-core/dist/esm/components/Brand';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {CompassDockMain} from '@patternfly/react-core/dist/esm/components/Compass';
import {Divider} from '@patternfly/react-core/dist/esm/components/Divider';
import {Masthead, MastheadBrand, MastheadContent, MastheadLogo, MastheadMain, MastheadToggle} from '@patternfly/react-core/dist/esm/components/Masthead';
import {Nav, NavItem, NavList} from '@patternfly/react-core/dist/esm/components/Nav';
import {Toolbar, ToolbarContent, ToolbarGroup, ToolbarItem} from '@patternfly/react-core/dist/esm/components/Toolbar';
import {Tooltip} from '@patternfly/react-core/dist/esm/components/Tooltip';
import {useUIStore} from '@stores/useUIStore';
import logo from '@shared/icons/camel-logo.svg';
import {getNavigationFirstMenu, getNavigationSecondMenu, MenuItem} from './navigation/NavigationMenu';
import {useTheme} from './theme/ThemeContext';
import './AppDock.css';
import {Content} from "@patternfly/react-core/dist/esm/components/Content";

export const AppDock: React.FunctionComponent = () => {

    const {isDark} = useTheme();
    const {pageId, setPageId} = useUIStore();
    const navigate = useNavigate();
    const location = useLocation();
    const dockedToggleRef = useRef<HTMLButtonElement>(null);

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
        // <CompassDockMain>
        //     <Masthead display={{default: 'inline'}} id="docked-masthead" variant="docked" className={isDark ? '' : 'light-theme-dock'}>
        //         <MastheadMain className={'dock-main-expanded'}>
        //             <MastheadBrand>
        //                 <MastheadLogo>
        //                     <div className={'dock-brand-expanded'}>
        //                         <Brand src={logo} alt="Apache Camel" heights={{default: '32px'}} widths={{default: '32px'}}/>
        //                         <h6 style={{fontWeight: '400'}}>Apache Camel Kameleon 0.1.0</h6>
        //                     </div>
        //                 </MastheadLogo>
        //             </MastheadBrand>
        //         </MastheadMain>
        //         <Divider/>
        //         <MastheadContent>
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
        //         </MastheadContent>
        //     </Masthead>
        // </CompassDockMain>
    );
};
