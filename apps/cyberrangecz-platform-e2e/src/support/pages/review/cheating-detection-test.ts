import { readChainRecord } from '../../shared-fixture';
import { type CheatingDetectionPayload, readDetection } from './cheating-detection';
import { expect, test as base } from './review-test';

interface CheatingDetectionFixtures {
    /** The finished time proximity detection the running browser's read-only specs share, created by the runs-ready setup. */
    ownDetection: CheatingDetectionPayload;
}

/** The review `test` extended with the browser's own finished cheating detection. */
export const test = base.extend<CheatingDetectionFixtures>({
    ownDetection: async ({ apiAs, shared, browserKey }, use) => {
        const { cheatingDetectionId } = readChainRecord(browserKey);
        expect(cheatingDetectionId, 'detection the runs-ready setup recorded').toBeDefined();
        await use(await readDetection(apiAs('trainingOrganizer'), shared.trainingInstance.id, cheatingDetectionId as number));
    },
});

export { expect };
