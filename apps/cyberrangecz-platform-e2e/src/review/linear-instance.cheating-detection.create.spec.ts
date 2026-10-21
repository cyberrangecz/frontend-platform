import {
    CHEATING_THRESHOLDS,
    CheatingDetectionOverview,
    detectionsOf,
    waitForFinishedDetection,
} from '../support/pages/review/cheating-detection';
import { expect, test } from '../support/pages/review/review-test';
import { CheatingDetectionCreatePage } from '../support/pages/training-instance/cheating-detection-create.page';
import { waitForNotification } from '../support/ui';

const DETECTION_RESPONSE_TIMEOUT_MILLISECONDS = 60_000;
const COMMAND_OFFSET_FROM_FORM_THRESHOLD = 100;
const DOUBLE_CLICK_OFFSET_FROM_FORM_THRESHOLD = 200;
const DOUBLE_CLICK_INTERVAL_MILLISECONDS = 80;
const RETRY_OFFSET_FROM_FORM_THRESHOLD = 1000;

function thresholdOf(formThreshold: number, offset: number, attempt: number): number {
    return formThreshold - offset - attempt * RETRY_OFFSET_FROM_FORM_THRESHOLD;
}

test.describe('linear-instance.cheating-detection.create (detections that run against the finished runs)', () => {
    test.use({ account: 'trainingOrganizer' });

    let create: CheatingDetectionCreatePage;

    test.beforeEach(async ({ page, shared }) => {
        create = new CheatingDetectionCreatePage(page);
        await create.open(shared.trainingInstance.id);
    });

    test('creates a time proximity detection, reports it and returns to the overview', async ({
        page,
        apiAs,
        shared,
        browserKey,
        checkpoint,
    }, testInfo) => {
        const threshold = thresholdOf(CHEATING_THRESHOLDS[browserKey].form, 0, testInfo.retry);
        await create.enableTimeProximity(threshold);
        await checkpoint(page, 'create form filled');
        await create.createControl.click();
        const notification = await waitForNotification(page, 'Cheating Detection started executing', { timeout: DETECTION_RESPONSE_TIMEOUT_MILLISECONDS });
        expect(notification.kind).toBe('success');
        await expect(page).toHaveURL(
            new RegExp(`/linear-instance/${shared.trainingInstance.id}/cheating-detection$`),
        );
        const detection = await waitForFinishedDetection(apiAs('trainingOrganizer'), shared.trainingInstance.id, threshold);
        const overview = new CheatingDetectionOverview(page, shared.trainingInstance.id);
        await overview.open();
        await expect(await overview.rowOf(detection.id)).toHaveCount(1);
    });

    test('creates a detection that includes a forbidden command', async ({ page, apiAs, shared, browserKey }, testInfo) => {
        const threshold = thresholdOf(CHEATING_THRESHOLDS[browserKey].form, COMMAND_OFFSET_FROM_FORM_THRESHOLD, testInfo.retry);
        await create.enableTimeProximity(threshold);
        await create.turnOn('Forbidden Commands');
        await create.addForbiddenCommand('BASH', 'nmap');
        await create.createControl.click();
        await waitForNotification(page, 'Cheating Detection started executing', { timeout: DETECTION_RESPONSE_TIMEOUT_MILLISECONDS });
        await waitForFinishedDetection(apiAs('trainingOrganizer'), shared.trainingInstance.id, threshold);
    });

    test('creates exactly one detection when the Create control is clicked twice quickly', async ({
        page,
        apiAs,
        shared,
        browserKey,
    }, testInfo) => {
        const threshold = thresholdOf(CHEATING_THRESHOLDS[browserKey].form, DOUBLE_CLICK_OFFSET_FROM_FORM_THRESHOLD, testInfo.retry);
        await create.enableTimeProximity(threshold);
        const box = await create.createControl.boundingBox();
        if (!box) {
            throw new Error('The Create control has no layout box to click');
        }
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        const startedNotification = waitForNotification(page, 'Cheating Detection started executing', { timeout: DETECTION_RESPONSE_TIMEOUT_MILLISECONDS });
        await page.mouse.click(centerX, centerY);
        await page.waitForTimeout(DOUBLE_CLICK_INTERVAL_MILLISECONDS);
        await page.mouse.click(centerX, centerY);
        await startedNotification;
        await expect(page).toHaveURL(/\/cheating-detection$/);
        const api = apiAs('trainingOrganizer');
        await waitForFinishedDetection(api, shared.trainingInstance.id, threshold);
        const detections = await detectionsOf(api, shared.trainingInstance.id);
        expect(detections.filter((detection) => detection.proximity_threshold === threshold)).toHaveLength(1);
    });
});
