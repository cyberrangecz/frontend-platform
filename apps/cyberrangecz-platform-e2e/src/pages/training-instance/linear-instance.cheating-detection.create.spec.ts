import {
    CheatingDetectionCreatePage,
    DETECTION_METHODS,
} from '../../support/pages/training-instance/cheating-detection-create.page';
import { expect, test } from '../../support/pages/training-instance/training-instance-test';
import { waitForInstanceStart } from '../../support/pages/training-instance/instance-data';
import { errorDialog, expectUrlWhileLoading, pageTitle, waitForNotification } from '../../support/ui';

test.use({ account: 'trainingOrganizer' });

const MAXIMUM_PROXIMITY_THRESHOLD_SECONDS = 86_400;
const INVALID_THRESHOLDS = ['0', '-5', '86401', '1.5'];

test.describe('linear-instance.cheating-detection.create', () => {
    test('checks the create form of an instance that has not started', async ({ page, createInstance, checkpoint }) => {
        test.setTimeout(240_000);
        const pageErrors: Error[] = [];
        page.on('pageerror', (error) => pageErrors.push(error));
        const instance = await createInstance({ purpose: 'cdcreatecheck' });
        const create = new CheatingDetectionCreatePage(page);
        await create.open(instance.id);

        await test.step('shows the page title and every detection method with its description', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText('Create Cheating Detection');
            for (const method of DETECTION_METHODS) {
                await expect.soft(create.methodSwitch(method), `${method} switch`).toBeVisible();
            }
            await expect
                .soft(
                    page.getByText('Shows users that had similar IP for accessing the training.'),
                    'location similarity description',
                )
                .toBeVisible();
            await expect
                .soft(
                    page.getByText('Shows users that used no commands to solve a level requiring commands.'),
                    'no commands description',
                )
                .toBeVisible();
            await expect.soft(create.createControl, 'create control').toBeVisible();
            await checkpoint(page, 'create form loaded');
        });

        await test.step('starts with the time proximity and forbidden commands panels closed and disabled', async () => {
            await expect
                .soft(create.timeProximityPanelHeader, 'time proximity panel expansion')
                .toHaveAttribute('aria-expanded', 'false');
            await expect
                .soft(create.timeProximityPanelHeader, 'time proximity panel availability')
                .toHaveAttribute('aria-disabled', 'true');
            await expect
                .soft(create.forbiddenCommandsPanelHeader, 'forbidden commands panel expansion')
                .toHaveAttribute('aria-expanded', 'false');
            await expect
                .soft(create.forbiddenCommandsPanelHeader, 'forbidden commands panel availability')
                .toHaveAttribute('aria-disabled', 'true');
        });

        await test.step('enables the answer similarity method for a training with variant answers', async () => {
            await expect.soft(create.methodSwitch('Answer Similarity'), 'answer similarity switch').toBeEnabled();
        });

        await test.step('opens the time proximity panel while its method is on and closes it again', async () => {
            await create.turnOn('Time Proximity');
            await expect
                .soft(create.timeProximityPanelHeader, 'time proximity panel expansion')
                .toHaveAttribute('aria-expanded', 'true');
            await expect.soft(create.timeThresholdInput, 'time threshold input').toBeVisible();
            await checkpoint(page, 'time proximity panel open');
            await create.turnOff('Time Proximity');
            await expect
                .soft(create.timeProximityPanelHeader, 'time proximity panel expansion after closing')
                .toHaveAttribute('aria-expanded', 'false');
        });

        await test.step('opens the forbidden commands panel while its method is on', async () => {
            await create.turnOn('Forbidden Commands');
            await expect
                .soft(create.forbiddenCommandsPanelHeader, 'forbidden commands panel expansion')
                .toHaveAttribute('aria-expanded', 'true');
            await expect.soft(create.addForbiddenCommandButton, 'add command button').toBeVisible();
            await create.turnOff('Forbidden Commands');
        });

        await test.step('keeps the field within one second and one day', async () => {
            await create.turnOn('Time Proximity');
            await expect.soft(create.timeThresholdInput, 'minimum threshold').toHaveAttribute('min', '1');
            await expect
                .soft(create.timeThresholdInput, 'maximum threshold')
                .toHaveAttribute('max', String(MAXIMUM_PROXIMITY_THRESHOLD_SECONDS));
        });

        for (const invalid of INVALID_THRESHOLDS) {
            await test.step(`does not send a threshold of ${invalid}`, async () => {
                await create.timeThresholdInput.fill(invalid);
                await create.timeThresholdInput.blur();
                await expect.soft(create.createControl, 'create control').toBeDisabled();
            });
        }

        await test.step('adds a numbered command row with a type choice and removes it', async () => {
            await create.open(instance.id);
            await create.turnOn('Forbidden Commands');
            await create.addForbiddenCommandButton.click();
            await expect.soft(create.commandInput(1), 'command input').toBeVisible();
            await expect.soft(create.bashRadio(1), 'BASH choice').toBeVisible();
            await expect.soft(create.metasploitRadio(1), 'Metasploit choice').toBeVisible();
            await checkpoint(page, 'forbidden command row added');
            await create.deleteCommandButtons.first().click();
            await expect.soft(create.commandInput(1), 'command input after removing').toHaveCount(0);
        });

        await test.step('removes a command from the middle and renumbers the rest', async () => {
            for (const [index, text] of ['first', 'second', 'third'].entries()) {
                await create.addForbiddenCommandButton.click();
                await create.commandInput(index + 1).fill(text);
            }
            await create.deleteCommandButtons.nth(1).click();
            await expect.soft(create.deleteCommandButtons, 'command rows').toHaveCount(2);
            await expect.soft(create.commandInput(1), 'first command').toHaveValue('first');
            await expect.soft(create.commandInput(2), 'second command').toHaveValue('third');
            expect
                .soft(
                    pageErrors.map((error) => error.message),
                    'page errors so far',
                )
                .toEqual([]);
        });

        await test.step('rejects a whitespace-only command', async () => {
            await create.open(instance.id);
            await create.turnOn('Forbidden Commands');
            await create.addForbiddenCommandButton.click();
            await create.bashRadio(1).check();
            await create.commandInput(1).fill('   ');
            await create.commandInput(1).blur();
            await expect.soft(page.getByText('Command text cannot be empty'), 'empty command message').toBeVisible();
            await expect.soft(create.createControl, 'create control').toBeDisabled();
        });

        await test.step('lets the organizer switch every detection method', async () => {
            for (const method of DETECTION_METHODS) {
                await expect.soft(create.methodSwitch(method), `${method} switch`).toBeEnabled();
                const before = await create.methodSwitch(method).isChecked();
                await create.methodSwitch(method).click();
                if (before) {
                    await expect.soft(create.methodSwitch(method), `${method} switch after click`).not.toBeChecked();
                } else {
                    await expect.soft(create.methodSwitch(method), `${method} switch after click`).toBeChecked();
                }
            }
        });
    });

    test('submits on an instance that has started', async ({ page, createInstance, checkpoint }) => {
        test.setTimeout(300_000);
        const instance = await createInstance({
            purpose: 'cdcreatesubmit',
            startsInMilliseconds: 10_000,
        });
        await waitForInstanceStart(instance);
        const create = new CheatingDetectionCreatePage(page);

        await test.step('sends the entered threshold with the detection', async () => {
            await create.open(instance.id);
            await create.turnOn('Time Proximity');
            await create.timeThresholdInput.fill('300');
            const request = await create.createAndCaptureRequest();
            expect.soft(request.postDataJSON(), 'request body with the entered threshold').toMatchObject({
                proximity_threshold: 300,
                time_proximity_state: 'QUEUED',
            });
        });

        await test.step('sends no threshold when the field stays empty, leaving the default to the backend', async () => {
            await create.open(instance.id);
            await create.turnOn('Time Proximity');
            await expect.soft(create.timeThresholdInput, 'time threshold input').toHaveValue('');
            const request = await create.createAndCaptureRequest();
            expect.soft(request.postDataJSON(), 'request body without a threshold').toMatchObject({
                proximity_threshold: null,
            });
        });

        await test.step('sends the commands with their types', async () => {
            await create.open(instance.id);
            await create.turnOn('Forbidden Commands');
            await create.addForbiddenCommandButton.click();
            await create.bashRadio(1).check();
            await create.commandInput(1).fill('rm -rf /tmp/Žluťoučký kůň <b>x</b>');
            await create.addForbiddenCommandButton.click();
            await create.metasploitRadio(2).check();
            await create.commandInput(2).fill('use exploit/multi/handler');
            const request = await create.createAndCaptureRequest();
            const body = request.postDataJSON() as {
                forbidden_commands: { command: string; type: string }[];
            };
            expect.soft(body.forbidden_commands, 'forbidden commands in the request body').toEqual([
                expect.objectContaining({
                    command: 'rm -rf /tmp/Žluťoučký kůň <b>x</b>',
                    type: 'BASH',
                }),
                expect.objectContaining({
                    command: 'use exploit/multi/handler',
                    type: 'MSF',
                }),
            ]);
        });

        await test.step('starts the detection and returns to the cheating detection overview', async () => {
            await create.open(instance.id);
            await create.turnOn('Location Similarity');
            await checkpoint(page, 'form filled');
            await create.createControl.click();
            await waitForNotification(page, 'Cheating Detection started executing');
            await expectUrlWhileLoading(page, new RegExp(`/linear-instance/${instance.id}/cheating-detection$`));
            await expect.soft(errorDialog(page), 'error dialog').toHaveCount(0);
        });
    });
});
