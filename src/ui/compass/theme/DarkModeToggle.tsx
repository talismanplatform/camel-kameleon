import React from 'react';
import {ToggleGroup, ToggleGroupItem} from '@patternfly/react-core/dist/esm/components/ToggleGroup';
import SunIcon from '@patternfly/react-icons/dist/esm/icons/sun-icon';
import MoonIcon from '@patternfly/react-icons/dist/esm/icons/moon-icon';
import {useTheme} from './ThemeContext';

const DarkModeToggle: React.FunctionComponent = () => {
    const {isDark, toggleDarkMode} = useTheme();

    return (
        <ToggleGroup aria-label="Dark mode toggle" className="dark-mode-toggle" isCompact>
            <ToggleGroupItem
                icon={<SunIcon/>}
                aria-label="light"
                buttonId="theme-toggle-light"
                isSelected={!isDark}
                onChange={(_, selected) => toggleDarkMode(!selected)}
            />
            <ToggleGroupItem
                icon={<MoonIcon/>}
                aria-label="dark"
                buttonId="theme-toggle-dark"
                isSelected={isDark}
                onChange={(_, selected) => toggleDarkMode(selected)}
            />
        </ToggleGroup>
    );
};

export default DarkModeToggle;
