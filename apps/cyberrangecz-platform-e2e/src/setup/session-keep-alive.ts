import { existsSync } from 'node:fs';
import { ACCOUNT_KEYS } from '../support/accounts';
import { RefreshTokenSource } from '../support/api/token-source';
import { environment } from '../support/environment';
import { type Origin, statePaths } from '../support/state-files';

const ORIGINS: Origin[] = ['application', 'deployed'];

/**
 * Refreshes the tokens of every saved account storage state, saving each new set. A session the
 * identity provider has already ended is left alone; the workers sign its account in again.
 */
async function refreshSavedSessions(): Promise<void> {
    const paths = ORIGINS.flatMap((origin) =>
        ACCOUNT_KEYS.map((account) => statePaths.storageState(account, origin)),
    ).filter((path) => existsSync(path));
    await Promise.allSettled(paths.map((path) => RefreshTokenSource.fromStorageState(path).tokens()));
}

/**
 * Global setup of the suite: for the whole run, refreshes every saved account's session on an
 * interval shorter than the identity provider's session idle timeout.
 *
 * @returns The global teardown, which stops the refreshes.
 */
export default function keepSessionsAlive(): () => void {
    const timer = setInterval(
        () => void refreshSavedSessions(),
        environment.sessionKeepAliveMinutes * 60_000,
    );
    timer.unref();
    return () => clearInterval(timer);
}
