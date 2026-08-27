import {useNavigate} from 'react-router-dom';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import {Button} from '@patternfly/react-core/dist/esm/components/Button';
import {EmptyState, EmptyStateActions, EmptyStateBody, EmptyStateFooter, EmptyStateVariant} from '@patternfly/react-core/dist/esm/components/EmptyState';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
import {ROUTES} from './Routes';

export function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <Bullseye>
            <EmptyState headingLevel="h2" icon={SearchIcon} titleText="Page not found" variant={EmptyStateVariant.lg}>
                <EmptyStateBody>The page you requested is not part of this dashboard.</EmptyStateBody>
                <EmptyStateFooter>
                    <EmptyStateActions>
                        <Button variant="primary" onClick={() => navigate(ROUTES.DASHBOARD)}>Back to dashboard</Button>
                    </EmptyStateActions>
                </EmptyStateFooter>
            </EmptyState>
        </Bullseye>
    );
}
