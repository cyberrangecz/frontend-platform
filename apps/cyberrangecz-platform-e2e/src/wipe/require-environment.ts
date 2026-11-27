import { assertRequiredEnvironment } from '../support/environment';

/** Global setup of the wipe: fails the run at start when a required environment variable is unset. */
export default function requireEnvironment(): void {
    assertRequiredEnvironment();
}
