import React from 'react';
import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import {EmptyState, EmptyStateBody} from '@patternfly/react-core/dist/esm/components/EmptyState';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';

interface Props {
    children: React.ReactNode;
    onError?: (error: Error) => void;
}

interface State {
    error?: Error;
}

/** Keeps a page level crash from taking the whole Compass shell down with it. */
export class ErrorBoundaryWrapper extends React.Component<Props, State> {

    state: State = {};

    static getDerivedStateFromError(error: Error): State {
        return {error};
    }

    componentDidCatch(error: Error) {
        this.props.onError?.(error);
    }

    render() {
        const {error} = this.state;
        if (error) {
            return (
                <Bullseye>
                    <EmptyState headingLevel="h2" icon={ExclamationCircleIcon} titleText="Something went wrong" status="danger">
                        <EmptyStateBody>{error.message}</EmptyStateBody>
                    </EmptyState>
                </Bullseye>
            );
        }
        return this.props.children;
    }
}
