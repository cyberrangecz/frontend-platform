import { expect, Page, test } from '@playwright/test';
import { signIn } from '../support/platform-session';

/**
 * Trainee-side checks of single sandbox per trainee against a deployed platform.
 * The tests share one trainee account and run in order, each one building on the state left by the last.
 *
 * Required environment:
 *   F07_PLATFORM_ORIGIN       origin of the deployed frontend
 *   F07_TRAINEE_USERNAME      account holding the trainee role, owning no sandbox at the start
 *   F07_TRAINEE_PASSWORD      password of that account
 *   F07_SELF_TOKEN            access token of a running instance that is not managed, with a free pool
 *   F07_OTHER_TOKEN           access token of a second running instance that is not managed, with its own pool
 *   F07_MANAGED_TOKEN         access token of a running managed instance with a ready organizer sandbox
 * Optional environment:
 *   F07_SELF_TITLE            title of the instance behind F07_SELF_TOKEN, default F07-self
 *   F07_OTHER_TITLE           title of the instance behind F07_OTHER_TOKEN, default F07-ending
 *   F07_ENDED_TOKEN          access token of an instance that has ended more than 2 minutes ago
 *   F07_BUILD_TIMEOUT_MS      longest wait for a sandbox build, default 600000
 *
 * The deployment must have the frontend key `enableTraineeSandboxAllocation` on and
 * training's `single.sandbox.per.user.enabled` on.
 */
const ORIGIN = process.env['F07_PLATFORM_ORIGIN'];
const USERNAME = process.env['F07_TRAINEE_USERNAME'];
const PASSWORD = process.env['F07_TRAINEE_PASSWORD'];
const SELF_TOKEN = process.env['F07_SELF_TOKEN'];
const OTHER_TOKEN = process.env['F07_OTHER_TOKEN'];
const MANAGED_TOKEN = process.env['F07_MANAGED_TOKEN'];
const ENDED_TOKEN = process.env['F07_ENDED_TOKEN'];
const BUILD_TIMEOUT_MS = Number(process.env['F07_BUILD_TIMEOUT_MS'] ?? 600_000);
const SELF_TITLE = process.env['F07_SELF_TITLE'] ?? 'F07-self';
const OTHER_TITLE = process.env['F07_OTHER_TITLE'] ?? 'F07-ending';
const ACCOUNT = { origin: ORIGIN ?? '', username: USERNAME ?? '', password: PASSWORD ?? '' };

const MESSAGES = {
    preparing: 'Your sandbox is not ready yet.',
    removing: 'Your sandbox is being removed.',
    blocked: 'You can have only one sandbox at a time.',
    missing: 'This training run has no sandbox any more.',
};

test.skip(
    [ORIGIN, USERNAME, PASSWORD, SELF_TOKEN, OTHER_TOKEN, MANAGED_TOKEN].some((value) => value === undefined),
    'F07_PLATFORM_ORIGIN, F07_TRAINEE_USERNAME, F07_TRAINEE_PASSWORD, F07_SELF_TOKEN, F07_OTHER_TOKEN and F07_MANAGED_TOKEN are required'
);

test.use({ baseURL: ORIGIN });
test.describe.configure({ mode: 'serial' });

let page: Page;

/** Types an access token of the form `prefix-pin` into the overview form and submits it once. */
async function submitToken(token: string): Promise<void> {
    const separator = token.lastIndexOf('-');
    await page.goto('/run');
    await page.getByRole('textbox', { name: 'Access Token Prefix' }).fill(token.slice(0, separator));
    await page.getByRole('textbox', { name: 'Access Token PIN' }).fill(token.slice(separator + 1));
    await page.getByRole('button', { name: 'Access', exact: true }).click();
}

/** Resolves with the body of the next access-token request answered by the training service. */
function nextAccessResponse() {
    return page.waitForResponse(
        (response) => response.url().includes('/training-runs?accessToken=') && response.request().method() === 'POST'
    );
}

function sandboxEntry(title: string) {
    return page.locator('div').filter({ hasText: new RegExp(`^${title}`) }).last();
}

/** Reloads the overview until the sandbox of the given instance reports `Ready`. */
async function waitUntilReady(title: string): Promise<void> {
    await expect(sandboxEntry(title)).toContainText('Ready', { timeout: BUILD_TIMEOUT_MS });
}

async function removeSandbox(title: string): Promise<void> {
    await sandboxEntry(title).getByRole('button', { name: 'Remove sandbox' }).click();
    await expect(page.getByRole('dialog')).toContainText(`Do you want to remove your sandbox of "${title}"?`);
    await page.getByRole('dialog').getByRole('button', { name: 'Remove', exact: true }).click();
}

async function activeSandboxCount(): Promise<number> {
    return page.evaluate(async () => {
        const response = await fetch('/training/api/v1/training-runs/user-active-sandboxes', {
            headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        });
        return ((await response.json()) as unknown[]).length;
    });
}

test.beforeAll(async ({ browser }) => {
    page = await (await browser.newContext({ baseURL: ORIGIN })).newPage();
    await signIn(page, ACCOUNT);
});

test.afterAll(async () => {
    await page.context().close();
});

test.describe('Trainee sandbox allocation, trainee side', () => {
    test('the user-active-sandboxes endpoint answers an empty list for a trainee without a sandbox', async () => {
        const answer = await page.evaluate(async () => {
            const response = await fetch('/training/api/v1/training-runs/user-active-sandboxes', {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
            });
            return { status: response.status, body: (await response.json()) as unknown[] };
        });
        expect(answer.status).toBe(200);
        expect(answer.body).toEqual([]);
    });

    test('overview starts without sandboxes', async () => {
        await page.goto('/run');
        await expect(page.getByText('Your Sandboxes')).toBeHidden();
        expect(await activeSandboxCount()).toBe(0);
    });

    test('entering a self-allocated token redirects to the preparing wait and builds one sandbox', async () => {
        const answered = nextAccessResponse();
        await submitToken(SELF_TOKEN ?? '');
        expect((await answered).status()).toBe(200);

        await expect(page).toHaveURL(/\/run\?sandbox=preparing$/);
        await expect(page.getByText(MESSAGES.preparing)).toBeVisible();
        await expect(page.getByText('Your Sandboxes')).toBeVisible();
        await expect(sandboxEntry(SELF_TITLE)).toContainText(/Waiting to be built|Being built, stage \d of \d/);
        expect(await activeSandboxCount()).toBe(1);
    });

    test('the list advances through the build stages without interaction', async () => {
        await expect(sandboxEntry(SELF_TITLE)).toContainText(/Being built, stage [23] of 3/, {
            timeout: BUILD_TIMEOUT_MS,
        });
    });

    test('resuming while the sandbox builds allocates nothing', async () => {
        await page.goto('/run');
        if ((await sandboxEntry(SELF_TITLE).innerText()).includes('Ready')) {
            test.skip(true, 'the sandbox was already ready');
        }
        await page.getByRole('button', { name: 'Resume training run' }).first().click();
        await expect(page).toHaveURL(/\/run\?sandbox=preparing$/);
        expect(await activeSandboxCount()).toBe(1);
    });

    test('entering the token again once ready starts the run at the first level', async () => {
        await page.goto('/run');
        await waitUntilReady(SELF_TITLE);

        const answered = nextAccessResponse();
        await submitToken(SELF_TOKEN ?? '');
        const body = (await (await answered).json()) as { start_time: string | null; abstract_level_dto: { order: number } };

        expect(body.start_time).not.toBeNull();
        expect(body.abstract_level_dto.order).toBe(0);
        await expect(page).toHaveURL(/\/run\/linear\/.+\/access$/);
    });

    test('a second not managed instance is blocked while the sandbox is active', async () => {
        const answered = nextAccessResponse();
        await submitToken(OTHER_TOKEN ?? '');
        expect((await answered).status()).toBe(200);

        await expect(page).toHaveURL(/\/run\?sandbox=blocked$/);
        await expect(page.getByText(MESSAGES.blocked)).toBeVisible();
        await expect(page.getByRole('row').filter({ hasText: OTHER_TITLE })).toHaveCount(0);
        expect(await activeSandboxCount()).toBe(1);
    });

    test('removing the sandbox asks for confirmation and leaves no sandbox behind', async () => {
        await page.goto('/run');
        await sandboxEntry(SELF_TITLE).getByRole('button', { name: 'Remove sandbox' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('dialog')).toBeHidden();
        expect(await activeSandboxCount()).toBe(1);

        await removeSandbox(SELF_TITLE);
        await expect(page.getByText('Sandbox removal requested')).toBeVisible();
        await expect(sandboxEntry(SELF_TITLE)).toContainText(/Being removed/, { timeout: 30_000 });
        await expect(sandboxEntry(SELF_TITLE).getByRole('button', { name: 'Remove sandbox' })).toHaveCount(0);
        await expect(page.getByText('Your Sandboxes')).toBeHidden({ timeout: BUILD_TIMEOUT_MS });
        expect(await activeSandboxCount()).toBe(0);
    });

    test('resuming a run whose sandbox was removed shows the missing wait and allocates nothing', async () => {
        await page.goto('/run');
        await page.getByRole('button', { name: 'Resume training run' }).first().click();

        await expect(page).toHaveURL(/\/run\?sandbox=missing$/);
        await expect(page.getByText(MESSAGES.missing)).toBeVisible();
        expect(await activeSandboxCount()).toBe(0);
    });

    test('entering the token again allocates a new sandbox, even when submitted several times in a row', async () => {
        await page.goto('/run');
        const prefix = (SELF_TOKEN ?? '').slice(0, (SELF_TOKEN ?? '').lastIndexOf('-'));
        const pin = (SELF_TOKEN ?? '').slice((SELF_TOKEN ?? '').lastIndexOf('-') + 1);
        await page.getByRole('textbox', { name: 'Access Token Prefix' }).fill(prefix);
        await page.getByRole('textbox', { name: 'Access Token PIN' }).fill(pin);
        await page.getByRole('button', { name: 'Access', exact: true }).dblclick();

        await expect(page).toHaveURL(/\/run\?sandbox=preparing$/);
        await expect(sandboxEntry(SELF_TITLE)).toContainText(/Waiting to be built|Being built/);
        expect(await activeSandboxCount()).toBe(1);
    });

    test('the back button during the wait keeps a single sandbox', async () => {
        await page.goBack();
        await expect(sandboxEntry(SELF_TITLE)).toContainText(/Waiting to be built|Being built|Ready/);
        expect(await activeSandboxCount()).toBe(1);
    });

    test('finishing the run removes its sandbox so another instance can be entered', async () => {
        await page.goto('/run');
        await waitUntilReady(SELF_TITLE);
        await submitToken(SELF_TOKEN ?? '');
        await expect(page).toHaveURL(/\/run\/linear\/.+\/access$/);

        await finishRunBySolvingEveryLevel();

        await page.goto('/run');
        await expect(page.getByText('Your Sandboxes')).toBeHidden({ timeout: 120_000 });
        expect(await activeSandboxCount()).toBe(0);

        const answered = nextAccessResponse();
        await submitToken(OTHER_TOKEN ?? '');
        expect((await answered).status()).toBe(200);
        await expect(page).toHaveURL(/\/run\?sandbox=preparing$/);
    });

    test('a managed instance is entered at a level immediately, without self-allocation', async () => {
        const answered = nextAccessResponse();
        await submitToken(MANAGED_TOKEN ?? '');
        const body = (await (await answered).json()) as {
            managed: boolean;
            sandbox_instance_ref_id: string | null;
            active_sandboxes: unknown[] | null;
        };

        expect(body.managed).toBe(true);
        expect(body.sandbox_instance_ref_id).not.toBeNull();
        expect(body.active_sandboxes).toBeNull();
        await expect(page).toHaveURL(/\/run\/linear\/.+\/access$/);
    });

    test('an instance that has ended answers 404 and allocates nothing', async () => {
        test.skip(ENDED_TOKEN === undefined, 'F07_ENDED_TOKEN is not set');
        const before = await activeSandboxCount();

        const answered = nextAccessResponse();
        await submitToken(ENDED_TOKEN ?? '');
        expect((await answered).status()).toBe(404);

        expect(await activeSandboxCount()).toBe(before);
    });
});

/** Walks the open run through every level, revealing each solution and answering with it. */
async function finishRunBySolvingEveryLevel(): Promise<void> {
    for (let level = 0; level < 20; level++) {
        if (page.url().includes('/results')) {
            return;
        }
        const finish = page.getByRole('button', { name: 'Finish', exact: true });
        const next = page.getByRole('button', { name: 'Next', exact: true });
        if (await finish.isVisible().catch(() => false)) {
            await answerAssessmentLevel();
            await finish.click();
            await page.waitForURL(/\/results$/);
        } else if (await next.isVisible().catch(() => false)) {
            await next.click();
        } else {
            await solveTrainingLevel();
        }
    }
}

/** Reveals the solution of a training level, reads the answer from it and submits it. */
async function solveTrainingLevel(): Promise<void> {
    await page.getByRole('button', { name: 'Reveal Solution' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reveal', exact: true }).click();
    const solution = await page.getByText(/The answer is/).first().innerText();
    const answer = solution.match(/The answer is\s+(.+?)$/m)?.[1] ?? 'start';
    await page.getByPlaceholder('Answer').fill(answer);
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
}

/** Answers every required question of an assessment level with its first option. */
async function answerAssessmentLevel(): Promise<void> {
    await page.evaluate(() => {
        document.querySelector<HTMLInputElement>('mat-checkbox input')?.click();
        document.querySelectorAll('mat-radio-group').forEach((group) => {
            group.querySelector<HTMLInputElement>('input[type=radio]')?.click();
        });
    });
}
