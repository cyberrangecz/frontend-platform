import { expect, test } from '../support/fixtures';
import { checkpointCharts, ownRunChartShows } from '../support/pages/review/chart-expectations';
import { expectedResultOf } from '../support/pages/review/expected-results';
import { describeTopology, type TopologyPayload } from '../support/pages/sandbox-definition/topology-description';
import { RunOverviewPage } from '../support/pages/run/run-overview-page';
import { TraineeRunPage } from '../support/pages/run/trainee-run-page';
import { AllocateDialog, waitForAllocationResponse } from '../support/pages/pool/allocate-dialog';
import { type AllocationUnitRecord, keepOrRemoveAllocationUnit } from '../support/pages/pool/pool-data';
import { PoolDetailPage } from '../support/pages/pool/pool-detail-page';
import {
    SHARED_TRAINING_ANSWERS,
    SHARED_TRAINING_HINTS,
    SHARED_TRAINING_LEVEL_ORDER,
    SHARED_TRAINING_LEVEL_TITLES,
    SHARED_TRAINING_LEVELS,
} from '../support/scenario/shared-training-loader';
import { TRAINEE_PLAYS, WRONG_FLAG, WRONG_PASSKEY } from '../support/scenario/trainee-plays';
import { findChainRecordOfPool, updateChainRecord, writeChainRecord } from '../support/shared-fixture';
import { waitForNotification, waitForPageReady } from '../support/ui';

const INCORRECT_ANSWER_LIMIT = 5;
const SANDBOX_READY_TIMEOUT_MILLISECONDS = 55 * 60_000;
const SANDBOX_POLL_INTERVALS = [10_000, 15_000, 30_000];

test.describe.serial('sandbox chain to a finished training run', () => {
    let allocationUnitId: number;
    let trainingRunId: number;

    test('allocates one sandbox in the shared pool through the allocate dialog', async ({
        openAs,
        apiAs,
        shared,
        browserKey,
        checkpoint,
    }) => {
        const earlierAttempt = findChainRecordOfPool(browserKey, shared.pool.id);
        if (
            earlierAttempt &&
            (await keepOrRemoveAllocationUnit(
                apiAs('sandboxOrganizer').sandbox,
                shared.pool.id,
                earlierAttempt.allocationUnitId,
            ))
        ) {
            allocationUnitId = earlierAttempt.allocationUnitId;
            test.info().annotations.push({
                type: 'allocation reused',
                description: `a retry of the serial group reuses allocation unit ${allocationUnitId}, as the pool has one slot per browser and the unit did not fail`,
            });
            return;
        }

        const page = await openAs('sandboxOrganizer');
        const poolPage = new PoolDetailPage(page);
        await poolPage.open(shared.pool.id);
        await checkpoint(page, 'pool page before allocation');

        const allocateControl = poolPage.allocateButton;
        await expect(allocateControl).toBeEnabled();
        const offersCount = async (): Promise<boolean> =>
            /sandboxes$/i.test((await allocateControl.innerText()).trim());

        if (await offersCount()) {
            const cancelledDialog = await AllocateDialog.openFrom(page, allocateControl);
            await checkpoint(page, 'allocate dialog open');
            await cancelledDialog.cancelButton.click();
            await expect(cancelledDialog.root).toBeHidden();
        }

        const allocationResponse = waitForAllocationResponse(page, shared.pool.id);
        const sendsCount = await offersCount();
        await allocateControl.click();
        if (sendsCount) {
            const dialog = new AllocateDialog(page);
            await dialog.sizeInput.fill('1');
            await expect(dialog.sizeInput).toHaveValue('1');
            await dialog.allocateButton.click();
        }
        const response = await allocationResponse;
        expect(response.status()).toBe(200);
        if (sendsCount) {
            expect(new URL(response.request().url()).searchParams.get('count')).toBe('1');
        }
        const units = (await response.json()).results as AllocationUnitRecord[];
        expect(units, 'exactly one allocation unit created').toHaveLength(1);
        allocationUnitId = units[0]!.id;
        writeChainRecord(browserKey, { poolId: shared.pool.id, allocationUnitId });

        await waitForNotification(page, /Allocation of (specified sandboxes of )?pool \d+/);
        await expect(poolPage.rowOf(allocationUnitId)).toBeVisible({ timeout: 60_000 });
        await checkpoint(page, 'allocation started');
    });

    test('waits until the allocated sandbox is ready and shows it ready on the pool page', async ({
        openAs,
        apiAs,
        shared,
        checkpoint,
    }) => {
        test.setTimeout(60 * 60_000);
        const sandboxApi = apiAs('sandboxOrganizer').sandbox;
        let outcome: 'building' | 'ready' | 'failed' = 'building';

        await expect
            .poll(
                async () => {
                    try {
                        const unit = await sandboxApi.get<AllocationUnitRecord>(
                            `/sandbox-allocation-units/${allocationUnitId}`,
                        );
                        if (unit.allocation_request.stages.includes('FAILED')) {
                            outcome = 'failed';
                            return outcome;
                        }
                        const sandboxes = await sandboxApi.getAll<{
                            allocation_unit_id: number;
                            ready: boolean;
                        }>(`/pools/${shared.pool.id}/sandboxes`);
                        const own = sandboxes.find((sandbox) => sandbox.allocation_unit_id === allocationUnitId);
                        outcome = own?.ready ? 'ready' : 'building';
                    } catch {
                        outcome = 'building';
                    }
                    return outcome;
                },
                {
                    message: `sandbox of allocation unit ${allocationUnitId} becomes ready`,
                    timeout: SANDBOX_READY_TIMEOUT_MILLISECONDS,
                    intervals: SANDBOX_POLL_INTERVALS,
                },
            )
            .not.toBe('building');
        expect(outcome, 'allocation did not fail').toBe('ready');

        const page = await openAs('sandboxOrganizer');
        const poolPage = new PoolDetailPage(page);
        await poolPage.open(shared.pool.id);
        await expect(poolPage.rowOf(allocationUnitId)).toContainText('build finished');
        await checkpoint(page, 'sandbox ready on the pool page');
    });

    test('the trainee enters the shared instance with its access token', async ({
        openAs,
        apiAs,
        shared,
        browserKey,
        checkpoint,
    }) => {
        const page = await openAs('chainTrainee');
        const overview = new RunOverviewPage(page);
        await overview.open();
        await checkpoint(page, 'run overview');

        const token = shared.trainingInstance.accessToken;
        await expect(overview.accessButton).toBeDisabled();
        await overview.fillTokenText(token);
        await expect(overview.accessButton).toBeEnabled();

        const accessResponse = page.waitForResponse(
            (response) =>
                response.request().method() === 'POST' &&
                response.url().includes('/training-runs?accessToken='),
        );
        await overview.accessButton.click();
        const response = await accessResponse;
        expect(response.status()).toBe(200);
        trainingRunId = (await response.json()).training_run_id as number;
        await expect(page).toHaveURL(new RegExp(`/run/linear/${token}/access$`));

        const run = new TraineeRunPage(page);
        await expect(run.levelTitle).toHaveText(SHARED_TRAINING_LEVEL_TITLES.info);
        await expect(run.timer).toBeVisible();
        await expect(run.stepLabels).toHaveCount(SHARED_TRAINING_LEVEL_ORDER.length);
        await expect(run.selectedStep).toContainText(SHARED_TRAINING_LEVEL_ORDER[0]!.slice(0, 8));
        await expect(run.lockedSteps).toHaveCount(SHARED_TRAINING_LEVEL_ORDER.length - 1);
        await checkpoint(page, 'run entered on the first level');

        const runs = await apiAs('trainingOrganizer').training.getAll<{
            id: number;
            sandbox_instance_allocation_id: number;
        }>(`/training-instances/${shared.trainingInstance.id}/training-runs`);
        const assigned = runs.find((candidate) => candidate.id === trainingRunId);
        expect(assigned, 'run listed in the shared instance').toBeDefined();
        updateChainRecord(browserKey, {
            trainingRunId,
            trainingRunAllocationUnitId: assigned!.sandbox_instance_allocation_id,
        });
    });

    test('the trainee plays every level and finishes the run', async ({
        openAs,
        apiAs,
        shared,
        browserKey,
        checkpoint,
    }) => {
        test.setTimeout(15 * 60_000);
        const play = TRAINEE_PLAYS[browserKey];
        const answers = SHARED_TRAINING_ANSWERS;
        const page = await openAs('chainTrainee');

        await test.step('resumes the run from the overview', async () => {
            const overview = new RunOverviewPage(page);
            await overview.open();
            const row = overview.rowOf(shared.trainingInstance.title);
            await expect(overview.resumeAction(row)).toBeEnabled();
            await expect(overview.resultsAction(row)).toBeDisabled();
            await overview.resumeAction(row).click();
            await expect(page).toHaveURL(new RegExp(`/run/linear/${trainingRunId}/resume$`));
        });

        const run = new TraineeRunPage(page);

        await test.step('info level', async () => {
            await expect(run.levelTitle).toHaveText(SHARED_TRAINING_LEVEL_ORDER[0]!);
            await expect(run.markdown).toContainText('This training is played by the e2e suite.');
            await expect(run.topologyToggle).toHaveCount(0);
            await checkpoint(page, 'info level');
            await run.button('Next').click();
        });

        await test.step('access level', async () => {
            await expect(run.levelTitle).toHaveText(SHARED_TRAINING_LEVEL_ORDER[1]!);
            await expect(run.selectedStep).toContainText(SHARED_TRAINING_LEVEL_ORDER[1]!.slice(0, 8));
            await expect(run.lockedSteps).toHaveCount(4);
            await expect(run.markdown).toContainText(
                `Connect to the sandbox, then submit ${answers.accessPasskey}.`,
            );
            await expect(run.topologyToggle).toBeVisible();
            await expect(run.topologyToggle.locator('mat-icon')).toHaveText('chevron_right');
            await run.topologyToggle.click();
            await expect(run.topologyToggle.locator('mat-icon')).toHaveText('polyline');
            await expect(page.locator('crczp-run-topology-wrapper crczp-topology-graph .graph-stabilized')).toBeVisible();
            const topology = await apiAs('sandboxDesigner').sandbox.get<TopologyPayload>(
                `/definitions/${shared.sandboxDefinition.id}/topology`,
            );
            await checkpoint(page, 'sandbox topology panel', describeTopology(topology));
            await run.topologyToggle.click();
            await expect(run.topologyToggle.locator('mat-icon')).toHaveText('chevron_right');

            const sshConfigResponse = page.waitForResponse((response) =>
                response.url().includes('/user-ssh-access'),
            );
            await run.sshConfigButton.click();
            expect((await sshConfigResponse).status()).toBe(200);

            await run.submitAnswerWithEnter(WRONG_PASSKEY);
            await waitForNotification(page, 'Incorrect passkey');
            await expect(run.levelTitle).toHaveText(SHARED_TRAINING_LEVEL_ORDER[1]!);
            await run.submitAnswer(WRONG_PASSKEY);
            await waitForNotification(page, 'You have already tried this answer.');
            await checkpoint(page, 'wrong passkey rejected');

            await run.submitAnswer(answers.accessPasskey);
            await expect(run.levelTitle).toHaveText(SHARED_TRAINING_LEVEL_ORDER[2]!);
        });

        await test.step('first training level', async () => {
            await expect(run.selectedStep).toContainText(SHARED_TRAINING_LEVEL_ORDER[2]!.slice(0, 8));
            await expect(run.lockedSteps).toHaveCount(3);
            await expect(run.markdown).toContainText(
                `Find the flag of the level "${SHARED_TRAINING_LEVEL_ORDER[2]}" and submit it.`,
            );
            await expect(run.hintButton(1)).toBeEnabled();
            await expect(run.hintButton(2)).toBeEnabled();
            await expect(run.revealSolutionButton).toBeEnabled();
            await expect(run.revealedHints).toHaveCount(0);

            const cancelledDialog = await run.openHintDialog(1);
            await expect(cancelledDialog.message).toContainText(
                `Do you want to reveal hint "${SHARED_TRAINING_HINTS[0]!.title}"?`,
            );
            await expect(cancelledDialog.message).toContainText(`It will cost you ${SHARED_TRAINING_HINTS[0]!.hint_penalty} points.`);
            await cancelledDialog.cancel();
            await expect(cancelledDialog.root).toBeHidden();
            await expect(run.revealedHints).toHaveCount(0);
            await expect(run.hintButton(1)).toBeEnabled();

            for (let position = 1; position <= play.hintsOnFirstTraining; position++) {
                const hint = SHARED_TRAINING_HINTS[position - 1]!;
                const dialog = await run.openHintDialog(position);
                await expect(dialog.message).toContainText(`It will cost you ${hint.hint_penalty} points.`);
                await dialog.confirm();
                await expect(dialog.root).toBeHidden();
                await expect(run.revealedHints).toHaveCount(position);
                await expect(run.revealedHints.nth(position - 1)).toContainText(hint.title);
                await expect(run.revealedHints.nth(position - 1)).toContainText(hint.content);
                await expect(run.hintButton(position)).toBeDisabled();
            }
            for (let position = play.hintsOnFirstTraining + 1; position <= SHARED_TRAINING_HINTS.length; position++) {
                await expect(run.hintButton(position)).toBeEnabled();
            }

            for (let attempt = 1; attempt <= play.wrongAnswersOnFirstTraining; attempt++) {
                await run.submitAnswer(`${WRONG_FLAG}-${attempt}`);
                await run.dismissIncorrectAnswerDialog(INCORRECT_ANSWER_LIMIT - attempt);
                await expect(run.levelTitle).toHaveText(SHARED_TRAINING_LEVEL_ORDER[2]!);
            }
            await checkpoint(page, 'first training level answered wrongly');

            await run.submitAnswer(answers.firstFlag);
            await expect(run.levelTitle).toHaveText(SHARED_TRAINING_LEVEL_ORDER[3]!);
        });

        await test.step('second training level with backtracking', async () => {
            await expect(run.lockedSteps).toHaveCount(2);
            await expect(run.revealedHints).toHaveCount(0);

            await run.step(2).click();
            await expect(run.levelTitle).toHaveText(SHARED_TRAINING_LEVEL_ORDER[2]!);
            await expect(run.button('Next')).toBeVisible();
            await expect(run.answerInput).toHaveCount(0);
            await expect(run.revealedHints).toHaveCount(play.hintsOnFirstTraining);
            await checkpoint(page, 'backtracked to the first training level');
            await run.button('Next').click();
            await expect(run.levelTitle).toHaveText(SHARED_TRAINING_LEVEL_ORDER[3]!);

            await run.step(5).click({ force: true });
            await expect(run.levelTitle).toHaveText(SHARED_TRAINING_LEVEL_ORDER[3]!);

            const solutionDialog = await run.openSolutionDialog();
            await expect(solutionDialog.message).toContainText('Do you want to reveal solution of this level?');
            await expect(solutionDialog.message).toContainText('All your points will be subtracted.');
            if (play.showsSolutionOnSecondTraining) {
                await solutionDialog.confirm();
                await expect(solutionDialog.root).toBeHidden();
                await expect(run.revealedHints.filter({ hasText: 'Solution' })).toContainText(
                    `Submit ${answers.secondFlag}.`,
                );
                await expect(run.revealSolutionButton).toBeDisabled();
            } else {
                await solutionDialog.cancel();
                await expect(solutionDialog.root).toBeHidden();
                await expect(run.revealedHints).toHaveCount(0);
                await expect(run.revealSolutionButton).toBeEnabled();
            }

            await run.submitAnswer(answers.secondFlag);
            await expect(run.levelTitle).toHaveText(SHARED_TRAINING_LEVEL_ORDER[4]!);
        });

        await test.step('variant answers training level', async () => {
            await expect(run.lockedSteps).toHaveCount(1);
            await expect(run.markdown).toContainText(SHARED_TRAINING_LEVELS.variantTraining.content);
            await expect(run.revealedHints).toHaveCount(0);

            const solutionDialog = await run.openSolutionDialog();
            await solutionDialog.confirm();
            await expect(solutionDialog.root).toBeHidden();
            await expect(run.revealSolutionButton).toBeDisabled();
            await expect(run.revealedSolution).not.toContainText('${ANSWER}');
            await expect(run.revealedSolutionAnswer).toHaveText(/^\d+$/);
            const variantAnswer = await run.revealedSolutionAnswer.innerText();
            updateChainRecord(browserKey, { variantAnswer });
            await checkpoint(page, 'variant level solution revealed');

            await run.submitAnswer(variantAnswer);
            await expect(run.levelTitle).toHaveText(SHARED_TRAINING_LEVEL_ORDER[5]!);
        });

        await test.step('assessment level', async () => {
            await expect(run.lockedSteps).toHaveCount(0);
            await expect(run.markdown).toContainText('Answer every question.');
            await expect(run.questions).toHaveCount(3);
            await expect(page.getByText('Answer required')).toHaveCount(3);
            await expect(run.button('Finish')).toBeDisabled();
            await expect(run.topologyToggle).toHaveCount(0);

            await run.freeFormInput.fill(play.assessment.freeForm);
            await run.page.getByRole('button', { name: 'Clear' }).click();
            await expect(run.freeFormInput).toHaveValue('');
            await run.freeFormInput.fill(play.assessment.freeForm);
            await run.multipleChoiceOption(play.assessment.multipleChoice).check();
            await expect(run.multipleChoiceOption(play.assessment.multipleChoice)).toBeChecked();
            await expect(run.button('Finish')).toBeDisabled();

            for (const [statement, option] of Object.entries(play.assessment.extendedMatching)) {
                await run.matchStatement(statement, option);
            }
            await expect(run.button('Finish')).toBeEnabled();
            await checkpoint(page, 'assessment answered');
            await run.button('Finish').click();
        });

        await test.step('lands on the results of the finished run', async () => {
            await expect(page).toHaveURL(new RegExp(`/run/linear/${trainingRunId}/results$`));
            await waitForPageReady(page);
            await checkpoint(page, 'results page');
            await checkpointCharts(page, checkpoint, ownRunChartShows(expectedResultOf(browserKey)));
        });

        await test.step('records the finished run', async () => {
            const runs = await apiAs('trainingOrganizer').training.getAll<{ id: number; state: string }>(
                `/training-instances/${shared.trainingInstance.id}/training-runs`,
            );
            expect(runs.find((candidate) => candidate.id === trainingRunId)?.state).toBe('FINISHED');
            updateChainRecord(browserKey, { trainingRunId, finished: true });
        });
    });
});
