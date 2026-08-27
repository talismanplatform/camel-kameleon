import {Bullseye} from '@patternfly/react-core/dist/esm/layouts/Bullseye';
import {Spinner} from '@patternfly/react-core/dist/esm/components/Spinner';

/** Shown while a lazily loaded page chunk is being fetched. */
export function PageFallback() {
    return (
        <Bullseye>
            <Spinner aria-label="Loading page"/>
        </Bullseye>
    );
}
