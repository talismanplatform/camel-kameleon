import React, {useState} from 'react';
import {Badge} from '@patternfly/react-core/dist/esm/components/Badge';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {Divider} from '@patternfly/react-core/dist/esm/components/Divider';
import {MenuToggle, MenuToggleElement} from '@patternfly/react-core/dist/esm/components/MenuToggle';
import {SearchInput} from '@patternfly/react-core/dist/esm/components/SearchInput';
import {Select, SelectList, SelectOption} from '@patternfly/react-core/dist/esm/components/Select';
import {Toolbar, ToolbarContent, ToolbarItem} from '@patternfly/react-core/dist/esm/components/Toolbar';
import FilterIcon from '@patternfly/react-icons/dist/esm/icons/filter-icon';
import CodeBranchIcon from '@patternfly/react-icons/dist/esm/icons/code-branch-icon';
import LayerGroupIcon from '@patternfly/react-icons/dist/esm/icons/layer-group-icon';
import TagIcon from '@patternfly/react-icons/dist/esm/icons/tag-icon';
import {ALL_REFS, ALL_REFS_LABEL, SCAN_SEVERITIES, ScanSeverity, VersionScan} from '@models/CveModels';
import {VulnerabilityFilters} from '@stores/useCveStore';

interface Props {
    versions: VersionScan[];
    selectedRef?: string;
    filters: VulnerabilityFilters;
    resultCount: number;
    onSelectRef: (ref: string) => void;
    onChange: (filters: Partial<VulnerabilityFilters>) => void;
    onReset: () => void;
}

export const CvesToolbar: React.FunctionComponent<Props> = (
    {versions, selectedRef, filters, resultCount, onSelectRef, onChange, onReset}
) => {

    const [isVersionOpen, setIsVersionOpen] = useState(false);
    const [isSeverityOpen, setIsSeverityOpen] = useState(false);

    function toggleSeverity(severity: ScanSeverity) {
        const severities = filters.severities.includes(severity)
            ? filters.severities.filter(s => s !== severity)
            : [...filters.severities, severity];
        onChange({severities});
    }

    const versionToggle = (toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
            ref={toggleRef}
            onClick={() => setIsVersionOpen(!isVersionOpen)}
            isExpanded={isVersionOpen}
            isDisabled={versions.length === 0}
        >
            {selectedRef === ALL_REFS ? ALL_REFS_LABEL : selectedRef ?? 'Select version'}
        </MenuToggle>
    );

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
            <ToolbarContent alignItems="center">
                <ToolbarItem>
                    <Select
                        id="version-select"
                        isOpen={isVersionOpen}
                        selected={selectedRef}
                        onSelect={(_event, value) => {
                            onSelectRef(value as string);
                            setIsVersionOpen(false);
                        }}
                        onOpenChange={setIsVersionOpen}
                        toggle={versionToggle}
                    >
                        <SelectList>
                            <SelectOption
                                value={ALL_REFS}
                                isSelected={selectedRef === ALL_REFS}
                                icon={<LayerGroupIcon/>}
                                description="Findings of every scanned version"
                            >
                                {ALL_REFS_LABEL}
                            </SelectOption>
                            <Divider component="li"/>
                            {versions.map(version => (
                                <SelectOption
                                    key={version.ref}
                                    value={version.ref}
                                    isSelected={version.ref === selectedRef}
                                    icon={version.kind === 'tag' ? <TagIcon/> : <CodeBranchIcon/>}
                                    description={version.release?.kind === 'lts' ? `LTS ${version.release.camelVersion}` : undefined}
                                >
                                    {version.ref}
                                </SelectOption>
                            ))}
                        </SelectList>
                    </Select>
                </ToolbarItem>
                <ToolbarItem>
                    <SearchInput
                        aria-label="Search vulnerabilities"
                        placeholder="Search by advisory, artifact or text"
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
                        onSelect={(_event, value) => toggleSeverity(value as ScanSeverity)}
                        onOpenChange={setIsSeverityOpen}
                        toggle={severityToggle}
                    >
                        <SelectList>
                            {SCAN_SEVERITIES.map(severity => (
                                <SelectOption
                                    key={severity}
                                    value={severity}
                                    hasCheckbox
                                    isSelected={filters.severities.includes(severity)}
                                >
                                    {severity}
                                </SelectOption>
                            ))}
                        </SelectList>
                    </Select>
                </ToolbarItem>
                <ToolbarItem variant="pagination">
                    <Badge>{`${resultCount} results`}</Badge>
                </ToolbarItem>
                <ToolbarItem>
                    <Button variant="link" isInline onClick={onReset}>Clear filters</Button>
                </ToolbarItem>
            </ToolbarContent>
        </Toolbar>
    );
};
