import type { BrowserKey } from '../../accounts';
import { expect, test as base } from '../../fixtures';
import { loadReviewRuns, type ReviewRun } from './review-runs';

interface ReviewWorkerFixtures {
    /** The run each browser's trainee played in the shared instance, loaded once per worker. */
    reviewRuns: Record<BrowserKey, ReviewRun>;
}

/** The suite's `test` extended with the runs of the shared instance, for the review specs. */
export const test = base.extend<object, ReviewWorkerFixtures>({
    reviewRuns: [
        async ({ apiAs, shared }, use) => {
            await use(await loadReviewRuns(apiAs('trainingOrganizer'), shared.trainingInstance.id));
        },
        { scope: 'worker' },
    ],
});

export { expect };
