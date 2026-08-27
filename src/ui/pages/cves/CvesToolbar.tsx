import React, {useState} from 'react';
import {Badge} from '@patternfly/react-core/dist/esm/components/Badge';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {MenuToggle, MenuToggleElement} from '@patternfly/react-core/dist/esm/components/MenuToggle';
import {SearchInput} from '@patternfly/react-core/dist/esm/components/SearchInput';
import {Select, SelectList, SelectOption} from '@patternfly/react-core/dist/esm/components/Select';
import {Switch} from '@patternfly/react-core/dist/esm/components/Switch';
import {Toolbar, ToolbarContent, ToolbarItem} from '@patternfly/react-core/dist/esm/components/Toolbar';
import FilterIcon from '@patternfly/react-icons/dist/esm/icons/filter-icon';
import {SEVERITIES, SEVERITY_LABEL, Severity} from '@models/CveModels';
import {CveFilters} from '@stores/useCveStore';

interface Props {
    filters: CveFilters;
    resultCount: number;
    onChange: (filters: Partial<CveFilters>) => void;
    onReset: () => void;
}

export const CvesToolbar: React.FunctionComponent<Props> = ({filters, resultCount, onChange, onReset}) => {

    const [isSeverityOpen, setIsSeverityOpen] = useState(false);

    function toggleSeverity(severity: Severity) {
        const severities = filters.severities.includes(severity)
            ? filters.severities.filter(s => s !== severity)
            : [...filters.severities, severity];
        onChange({severities});
    }

    const severityToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
            ref={toggleRef}
            onClick={() => setIsSeverityOpen(!isSeverityOpen)}
            isExpanded={isSeverityOpen}
            icon={<FilterIcon/>}
        >
            Severity
            {filters.severities.length > 0 && <Badge isRead>{filters.severities.length}</Badge>}
        </MenuToggle>
    );

    return (
        <Toolbar id="cves-toolbar" clearAllFilters={onReset} collapseListedFiltersBreakpoint="xl">
            <ToolbarContent>
                <ToolbarItem>
                    <SearchInput
                        aria-label="Search CVEs"
                        placeholder="Search by CVE, component or text"
                        value={filters.search}
                        onChange={(_event, value) => onChange({search: value})}
                        onClear={() => onChange({search: ''})}
                    />
                </ToolbarItem>
                <ToolbarItem>
                    <Select
                        id="severity-select"
                        isOpen={isSeverityOpen}
                        selected={filters.severities}
                        onSelect={(_event, value) => toggleSeverity(value as Severity)}
                        onOpenChange={setIsSeverityOpen}
                        toggle={severityToggle}
                    >
                        <SelectList>
                            {SEVERITIES.map(severity => (
                                <SelectOption
                                    key={severity}
                                    value={severity}
                                    hasCheckbox
                                    isSelected={filters.severities.includes(severity)}
                                >
                                    {SEVERITY_LABEL[severity]}
                                </SelectOption>
                            ))}
                        </SelectList>
                    </Select>
                </ToolbarItem>
                <ToolbarItem>
                    <Switch
                        id="only-open-switch"
                        label="Unresolved only"
                        isChecked={filters.onlyOpen}
                        onChange={(_event, checked) => onChange({onlyOpen: checked})}
                    />
                </ToolbarItem>
                <ToolbarItem variant="pagination">
                    <Badge isRead>{`${resultCount} results`}</Badge>
                </ToolbarItem>
                <ToolbarItem>
                    <Button variant="link" isInline onClick={onReset}>Clear filters</Button>
                </ToolbarItem>
            </ToolbarContent>
        </Toolbar>
    );
};
