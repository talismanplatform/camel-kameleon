import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Badge} from '@patternfly/react-core/dist/esm/components/Badge';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {Card, CardBody, CardFooter, CardTitle} from '@patternfly/react-core/dist/esm/components/Card';
import {Content, ContentVariants} from '@patternfly/react-core/dist/esm/components/Content';
import {EmptyState, EmptyStateBody} from '@patternfly/react-core/dist/esm/components/EmptyState';
import {SearchInput} from '@patternfly/react-core/dist/esm/components/SearchInput';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';
import {Title} from '@patternfly/react-core/dist/esm/components/Title';
import {ToggleGroup, ToggleGroupItem} from '@patternfly/react-core/dist/esm/components/ToggleGroup';
import {Toolbar, ToolbarContent, ToolbarItem} from '@patternfly/react-core/dist/esm/components/Toolbar';
import {Gallery} from '@patternfly/react-core/dist/esm/layouts/Gallery';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import {Flex, FlexItem} from '@patternfly/react-core/dist/esm/layouts/Flex';
import ArrowRightIcon from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon';
import CubesIcon from '@patternfly/react-icons/dist/esm/icons/cubes-icon';
import {useCveStore} from '@stores/useCveStore';
import {ROUTES} from '@compass/navigation/Routes';
import {usePageContext} from '@compass/usePageContext';
import {SeverityLabel} from '@shared/ui/SeverityLabel';

const ALL_CATEGORIES = 'All';

export const ComponentsPage: React.FunctionComponent = () => {

    const navigate = useNavigate();
    const components = useCveStore((s) => s.components);
    const loading = useCveStore((s) => s.loading);
    const setFilters = useCveStore((s) => s.setFilters);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState(ALL_CATEGORIES);

    usePageContext(
        'Components',
        <Title headingLevel="h1" size="xl">Affected components</Title>,
        <Badge isRead>{`${components.length} artifacts`}</Badge>,
        [components.length]
    );

    if (loading && components.length === 0) {
        return <Bullseye><Spinner aria-label="Loading components"/></Bullseye>;
    }

    const categories = [ALL_CATEGORIES, ...new Set(components.map(component => component.category))];
    const visible = components.filter(component =>
        (category === ALL_CATEGORIES || component.category === category)
        && component.artifactId.toLowerCase().includes(search.trim().toLowerCase()));

    function showCves(artifactId: string) {
        setFilters({search: artifactId, severities: [], onlyOpen: false});
        navigate(ROUTES.CVES);
    }

    return (
        <div className="page-section components-page">
            <Toolbar id="components-toolbar">
                <ToolbarContent>
                    <ToolbarItem>
                        <SearchInput
                            aria-label="Search components"
                            placeholder="Search artifact"
                            value={search}
                            onChange={(_event, value) => setSearch(value)}
                            onClear={() => setSearch('')}
                        />
                    </ToolbarItem>
                    <ToolbarItem>
                        <ToggleGroup aria-label="Component category">
                            {categories.map(item => (
                                <ToggleGroupItem
                                    key={item}
                                    text={item}
                                    buttonId={`category-${item}`}
                                    isSelected={category === item}
                                    onChange={() => setCategory(item)}
                                />
                            ))}
                        </ToggleGroup>
                    </ToolbarItem>
                </ToolbarContent>
            </Toolbar>

            {visible.length === 0 ? (
                <EmptyState headingLevel="h2" icon={CubesIcon} titleText="No components">
                    <EmptyStateBody>No artifact matches the current search.</EmptyStateBody>
                </EmptyState>
            ) : (
                <Gallery hasGutter minWidths={{default: '260px'}}>
                    {visible.map(component => (
                        <Card key={component.artifactId} isCompact isClickable>
                            <CardTitle>
                                <Flex justifyContent={{default: 'justifyContentSpaceBetween'}} alignItems={{default: 'alignItemsCenter'}}>
                                    <FlexItem>{component.artifactId}</FlexItem>
                                    <FlexItem><Badge>{component.cveCount}</Badge></FlexItem>
                                </Flex>
                            </CardTitle>
                            <CardBody>
                                <Flex direction={{default: 'column'}} gap={{default: 'gapSm'}}>
                                    <FlexItem>
                                        <Content component={ContentVariants.small}>{`Category: ${component.category}`}</Content>
                                    </FlexItem>
                                    <FlexItem>
                                        {component.highestSeverity === 'none'
                                            ? <Content component={ContentVariants.small}>No known advisory</Content>
                                            : <SeverityLabel severity={component.highestSeverity} isCompact/>}
                                    </FlexItem>
                                </Flex>
                            </CardBody>
                            <CardFooter>
                                <Button variant="link" isInline icon={<ArrowRightIcon/>} iconPosition="end"
                                        onClick={() => showCves(component.artifactId)}>
                                    Show CVEs
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </Gallery>
            )}
        </div>
    );
};
