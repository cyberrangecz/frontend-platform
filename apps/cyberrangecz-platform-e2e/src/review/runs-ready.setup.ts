import { expect, test as setup } from '../support/fixtures';
import { CHEATING_THRESHOLDS, createFinishedDetection } from '../support/pages/review/cheating-detection';
import { readChainRecord, updateChainRecord } from '../support/shared-fixture';

setup('the browser chain left a finished training run', async ({ apiAs, browserKey, shared }) => {
    const record = readChainRecord(browserKey);
    expect(record.trainingRunId, 'training run id recorded by the chain').toBeDefined();
    const runs = await apiAs('trainingOrganizer').training.getAll<{ id: number; state: string }>(
        `/training-instances/${shared.trainingInstance.id}/training-runs`,
    );
    const run = runs.find((candidate) => candidate.id === record.trainingRunId);
    expect(run, 'run listed in the shared training instance').toBeDefined();
    expect(run?.state).toBe('FINISHED');
});

setup('the browser has a finished cheating detection of its own', async ({ apiAs, browserKey, shared }) => {
    const detection = await createFinishedDetection(
        apiAs('trainingOrganizer'),
        shared.trainingInstance.id,
        CHEATING_THRESHOLDS[browserKey].fixture,
    );
    updateChainRecord(browserKey, { cheatingDetectionId: detection.id });
});
