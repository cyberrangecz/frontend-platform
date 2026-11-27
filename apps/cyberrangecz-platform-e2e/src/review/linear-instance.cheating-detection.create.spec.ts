import {
    CHEATING_THRESHOLDS,
    CheatingDetectionOverview,
    detectionsOf,
    waitForFinishedDetection,
} from '../support/pages/review/cheating-detection';
import { expect, test } from '../support/pages/review/review-test';
import { CheatingDetectionCreatePage } from '../support/pages/training-instance/cheating-detection-create.page';
import { doubleClickAfterRender, waitForNotification } from '../support/ui';

const DETECTION_RESPONSE_TIMEOUT_MILLISECONDS = 60_000;
const COMMAND_OFFSET_FROM_FORM_THRESHOLD = 100;
const DOUBLE_CLICK_OFFSET_FROM_FORM_THRESHOLD = 200;
const RETRY_OFFSET_FROM_FORM_THRESHOLD = 1000;

function thresholdOf(formThreshold: number, offset: number, attempt: number): number {
    return formThreshold - offset - attempt * RETRY_OFFSET_FROM_FORM_THRESHOLD;
}

test.describe('linear-instance.cheating-detection.create (detections that run against the finished runs)', () => {
    test.use({ account: 'trainingOrganizer' });

    test('creates three detections from the form on the shared instance', async ({
        page,
        apiAs,
        shared,
        browserKey,
        checkpoint,
    }, testInfo) => {
        test.setTimeout(300_000);
        const api = apiAs('trainingOrganizer');
        const formThreshold = CHEATING_THRESHOLDS[browserKey].form;
        const timeProximityThreshold = thresholdOf(formThreshold, 0, testInfo.retry);
        const forbiddenCommandThreshold = thresholdOf(formThreshold, COMMAND_OFFSET_FROM_FORM_THRESHOLD, testInfo.retry);
        const doubleClickThreshold = thresholdOf(formThreshold, DOUBLE_CLICK_OFFSET_FROM_FORM_THRESHOLD, testInfo.retry);
        const create = new CheatingDetectionCreatePage(page);

        await test.step('creates a time proximity detection, reports it and returns to the overview', async () => {
            await create.open(shared.trainingInstance.id);
            await create.enableTimeProximity(timeProximityThreshold);
            await checkpoint(page, 'create form filled');
            await create.createControl.click();
            const notification = await waitForNotification(page, 'Cheating Detection started executing', {
                timeout: DETECTION_RESPONSE_TIMEOUT_MILLISECONDS,
            });
            expect.soft(notification.kind, 'notification kind').toBe('success');
            await expect(page).toHaveURL(new RegExp(`/linear-instance/${shared.trainingInstance.id}/cheating-detection$`));
        });

        await test.step('creates a detection that includes a forbidden command', async () => {
            await create.open(shared.trainingInstance.id);
            await create.enableTimeProximity(forbiddenCommandThreshold);
            await create.turnOn('Forbidden Commands');
            await create.addForbiddenCommand('BASH', 'nmap');
            await create.createControl.click();
            await waitForNotification(page, 'Cheating Detection started executing', {
                timeout: DETECTION_RESPONSE_TIMEOUT_MILLISECONDS,
            });
        });

        await test.step('creates exactly one detection when the Create control is clicked twice quickly', async () => {
            await create.open(shared.trainingInstance.id);
            await create.enableTimeProximity(doubleClickThreshold);
            const startedNotification = waitForNotification(page, 'Cheating Detection started executing', {
                timeout: DETECTION_RESPONSE_TIMEOUT_MILLISECONDS,
            });
            await Promise.all([startedNotification, doubleClickAfterRender(create.createControl)]);
            await expect(page).toHaveURL(/\/cheating-detection$/);
        });

        await test.step('waits until the three detections finished', async () => {
            const timeProximityDetection = await waitForFinishedDetection(
                api,
                shared.trainingInstance.id,
                timeProximityThreshold,
            );
            await waitForFinishedDetection(api, shared.trainingInstance.id, forbiddenCommandThreshold);
            await waitForFinishedDetection(api, shared.trainingInstance.id, doubleClickThreshold);
            const overview = new CheatingDetectionOverview(page, shared.trainingInstance.id);
            await overview.openShowingEveryDetection();
            await expect
                .soft(await overview.rowOf(timeProximityDetection.id), 'row of the time proximity detection')
                .toHaveCount(1);
        });

        await test.step('counts one detection for the double click', async () => {
            const detections = await detectionsOf(api, shared.trainingInstance.id);
            expect
                .soft(
                    detections.filter((detection) => detection.proximity_threshold === doubleClickThreshold),
                    'detections of the double click',
                )
                .toHaveLength(1);
        });
    });
});
