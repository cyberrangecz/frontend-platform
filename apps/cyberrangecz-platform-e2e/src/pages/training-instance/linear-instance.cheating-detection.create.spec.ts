import { expectRedirectedAway } from '../../support/route-guard';
import {
    CheatingDetectionCreatePage,
    DETECTION_METHODS,
} from '../../support/pages/training-instance/cheating-detection-create.page';
import { expect, test } from '../../support/pages/training-instance/training-instance-test';
import { waitForInstanceStart } from '../../support/pages/training-instance/instance-data';
import { errorDialog, expectUrlWhileLoading, pageTitle, waitForNotification } from '../../support/ui';

test.use({ account: 'trainingOrganizer' });

const MAXIMUM_PROXIMITY_THRESHOLD_SECONDS = 86_400;

test.describe('linear-instance.cheating-detection.create', () => {
    test('shows the page title and every detection method with its description', async ({
        page,
        createInstance,
        checkpoint,
    }) => {
        const instance = await createInstance({ purpose: 'cdcreateshow' });
        const create = new CheatingDetectionCreatePage(page);
        await create.open(instance.id);
        await expect(pageTitle(page)).toHaveText('Create Cheating Detection');
        for (const method of DETECTION_METHODS) {
            await expect(create.methodSwitch(method)).toBeVisible();
        }
        await expect(page.getByText('Shows users that had similar IP for accessing the training.')).toBeVisible();
        await expect(page.getByText('Shows users that used no commands to solve a level requiring commands.')).toBeVisible();
        await expect(create.createControl).toBeVisible();
        await checkpoint(page, 'create form loaded');
    });

    test('starts with the time proximity and forbidden commands panels closed and disabled', async ({
        page,
        createInstance,
    }) => {
        const instance = await createInstance({ purpose: 'cdcreatepanels' });
        const create = new CheatingDetectionCreatePage(page);
        await create.open(instance.id);
        await expect(create.timeProximityPanelHeader).toHaveAttribute('aria-expanded', 'false');
        await expect(create.timeProximityPanelHeader).toHaveAttribute('aria-disabled', 'true');
        await expect(create.forbiddenCommandsPanelHeader).toHaveAttribute('aria-expanded', 'false');
        await expect(create.forbiddenCommandsPanelHeader).toHaveAttribute('aria-disabled', 'true');
    });

    test('enables the answer similarity method for a training with variant answers', async ({
        page,
        createInstance,
    }) => {
        const instance = await createInstance({ purpose: 'cdcreateanswers' });
        const create = new CheatingDetectionCreatePage(page);
        await create.open(instance.id);
        await expect(create.methodSwitch('Answer Similarity')).toBeEnabled();
    });

    test('lets the organizer switch every detection method', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'cdcreateswitch' });
        const create = new CheatingDetectionCreatePage(page);
        await create.open(instance.id);
        for (const method of DETECTION_METHODS) {
            await expect(create.methodSwitch(method)).toBeEnabled();
            const before = await create.methodSwitch(method).isChecked();
            await create.methodSwitch(method).click();
            if (before) {
                await expect(create.methodSwitch(method)).not.toBeChecked();
            } else {
                await expect(create.methodSwitch(method)).toBeChecked();
            }
        }
    });

    test('opens the time proximity panel while its method is on and closes it again', async ({
        page,
        createInstance,
        checkpoint,
    }) => {
        const instance = await createInstance({ purpose: 'cdcreatetime' });
        const create = new CheatingDetectionCreatePage(page);
        await create.open(instance.id);
        await create.turnOn('Time Proximity');
        await expect(create.timeProximityPanelHeader).toHaveAttribute('aria-expanded', 'true');
        await expect(create.timeThresholdInput).toBeVisible();
        await checkpoint(page, 'time proximity panel open');
        await create.turnOff('Time Proximity');
        await expect(create.timeProximityPanelHeader).toHaveAttribute('aria-expanded', 'false');
    });

    test('opens the forbidden commands panel while its method is on', async ({ page, createInstance }) => {
        const instance = await createInstance({ purpose: 'cdcreateforbidden' });
        const create = new CheatingDetectionCreatePage(page);
        await create.open(instance.id);
        await create.turnOn('Forbidden Commands');
        await expect(create.forbiddenCommandsPanelHeader).toHaveAttribute('aria-expanded', 'true');
        await expect(create.addForbiddenCommandButton).toBeVisible();
    });

    test.describe('time threshold', () => {
        test('sends the entered threshold with the detection', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'cdcreatethreshold', startsInMilliseconds: 10_000 });
            await waitForInstanceStart(instance);
            const create = new CheatingDetectionCreatePage(page);
            await create.open(instance.id);
            await create.turnOn('Time Proximity');
            await create.timeThresholdInput.fill('300');
            const request = await create.createAndCaptureRequest();
            expect(request.postDataJSON()).toMatchObject({
                proximity_threshold: 300,
                time_proximity_state: 'QUEUED',
            });
        });

        test('sends no threshold when the field stays empty, leaving the default to the backend', async ({
            page,
            createInstance,
        }) => {
            const instance = await createInstance({ purpose: 'cdcreatedefault', startsInMilliseconds: 10_000 });
            await waitForInstanceStart(instance);
            const create = new CheatingDetectionCreatePage(page);
            await create.open(instance.id);
            await create.turnOn('Time Proximity');
            await expect(create.timeThresholdInput).toHaveValue('');
            const request = await create.createAndCaptureRequest();
            expect(request.postDataJSON()).toMatchObject({ proximity_threshold: null });
        });

        test('keeps the field within one second and one day', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'cdcreatebounds' });
            const create = new CheatingDetectionCreatePage(page);
            await create.open(instance.id);
            await create.turnOn('Time Proximity');
            await expect(create.timeThresholdInput).toHaveAttribute('min', '1');
            await expect(create.timeThresholdInput).toHaveAttribute('max', String(MAXIMUM_PROXIMITY_THRESHOLD_SECONDS));
        });

        for (const invalid of ['0', '-5', '86401', '1.5']) {
            test(`does not send a threshold of ${invalid}`, async ({ page, createInstance }) => {
                const instance = await createInstance({
                    purpose: `cdcreateinvalid-${invalid.replace(/\D/g, '')}`,
                });
                const create = new CheatingDetectionCreatePage(page);
                await create.open(instance.id);
                await create.turnOn('Time Proximity');
                await create.timeThresholdInput.fill(invalid);
                await create.timeThresholdInput.blur();
                await expect(create.createControl).toBeDisabled();
            });
        }
    });

    test.describe('forbidden commands', () => {
        test('adds a numbered command row with a type choice and removes it', async ({
            page,
            createInstance,
            checkpoint,
        }) => {
            const instance = await createInstance({ purpose: 'cdcreateadd' });
            const create = new CheatingDetectionCreatePage(page);
            await create.open(instance.id);
            await create.turnOn('Forbidden Commands');
            await create.addForbiddenCommandButton.click();
            await expect(create.commandInput(1)).toBeVisible();
            await expect(create.bashRadio(1)).toBeVisible();
            await expect(create.metasploitRadio(1)).toBeVisible();
            await checkpoint(page, 'forbidden command row added');
            await create.deleteCommandButtons.first().click();
            await expect(create.commandInput(1)).toHaveCount(0);
        });

        test('removes a command from the middle and renumbers the rest', async ({ page, createInstance }) => {
            const pageErrors: Error[] = [];
            page.on('pageerror', (error) => pageErrors.push(error));
            const instance = await createInstance({ purpose: 'cdcreatemiddle' });
            const create = new CheatingDetectionCreatePage(page);
            await create.open(instance.id);
            await create.turnOn('Forbidden Commands');
            for (const [index, text] of ['first', 'second', 'third'].entries()) {
                await create.addForbiddenCommandButton.click();
                await create.commandInput(index + 1).fill(text);
            }
            await create.deleteCommandButtons.nth(1).click();
            await expect(create.deleteCommandButtons).toHaveCount(2);
            await expect(create.commandInput(1)).toHaveValue('first');
            await expect(create.commandInput(2)).toHaveValue('third');
            expect(pageErrors.map((error) => error.message)).toEqual([]);
        });

        test('rejects a whitespace-only command', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'cdcreateblank' });
            const create = new CheatingDetectionCreatePage(page);
            await create.open(instance.id);
            await create.turnOn('Forbidden Commands');
            await create.addForbiddenCommandButton.click();
            await create.bashRadio(1).check();
            await create.commandInput(1).fill('   ');
            await create.commandInput(1).blur();
            await expect(page.getByText('Command text cannot be empty')).toBeVisible();
            await expect(create.createControl).toBeDisabled();
        });

        test('sends the commands with their types', async ({ page, createInstance }) => {
            const instance = await createInstance({ purpose: 'cdcreatesend', startsInMilliseconds: 10_000 });
            await waitForInstanceStart(instance);
            const create = new CheatingDetectionCreatePage(page);
            await create.open(instance.id);
            await create.turnOn('Forbidden Commands');
            await create.addForbiddenCommandButton.click();
            await create.bashRadio(1).check();
            await create.commandInput(1).fill('rm -rf /tmp/Žluťoučký kůň <b>x</b>');
            await create.addForbiddenCommandButton.click();
            await create.metasploitRadio(2).check();
            await create.commandInput(2).fill('use exploit/multi/handler');
            const request = await create.createAndCaptureRequest();
            const body = request.postDataJSON() as { forbidden_commands: { command: string; type: string }[] };
            expect(body.forbidden_commands).toEqual([
                expect.objectContaining({ command: 'rm -rf /tmp/Žluťoučký kůň <b>x</b>', type: 'BASH' }),
                expect.objectContaining({ command: 'use exploit/multi/handler', type: 'MSF' }),
            ]);
        });
    });

    test.describe('save', () => {
        test('starts the detection and returns to the cheating detection overview', async ({
            page,
            createInstance,
            checkpoint,
        }) => {
            const instance = await createInstance({ purpose: 'cdcreatesave', startsInMilliseconds: 10_000 });
            await waitForInstanceStart(instance);
            const create = new CheatingDetectionCreatePage(page);
            await create.open(instance.id);
            await create.turnOn('Location Similarity');
            await checkpoint(page, 'form filled');
            await create.createControl.click();
            await waitForNotification(page, 'Cheating Detection started executing');
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/cheating-detection$`));
            await expect(errorDialog(page)).toHaveCount(0);
        });
    });

    test.describe('access', () => {
        for (const role of ['trainingDesigner', 'trainee'] as const) {
            test(`sends the ${role} account away from /linear-instance/:id/cheating-detection/create`, async ({ openAs, createInstance }) => {
                const instance = await createInstance({ purpose: `cdcreateaccess-${role}` });
                await expectRedirectedAway(openAs, role, `/linear-instance/${instance.id}/cheating-detection/create`);
            });
        }
    });
});
