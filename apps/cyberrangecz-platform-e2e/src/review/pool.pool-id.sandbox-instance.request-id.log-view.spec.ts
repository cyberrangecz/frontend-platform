import type { Page } from '@playwright/test';
import { expect, test } from '../support/fixtures';
import {
    ANSIBLE_LOG,
    captureClipboardWrites,
    copiedTexts,
    fixedOutputs,
    LogView,
    mockRunningStage,
    mockStageOutputs,
    numberedLog,
    PRETTIFIED_RESULT_LINES,
    TERRAFORM_LOG,
    USER_AGENTS,
    type StageKind,
} from '../support/pages/pool/log-view-page';
import { locateChainSandbox, type ChainSandbox } from '../support/pages/pool/review-sandbox';
import { readChainRecord } from '../support/shared-fixture';
import {
    captureDownload,
    dismissErrorDialog,
    errorDialog,
    waitForNotification,
    waitForPageReady,
} from '../support/ui';

test.use({ account: 'sandboxOrganizer', userAgent: USER_AGENTS.linux });

const RAW_RESULT_LINE = 'ok: [host1] => {"changed": false, "msg": "done"}';
const LONG_ANSIBLE_LOG = `${ANSIBLE_LOG}\n${numberedLog('Padding', 300)}`;
const LONG_WRAPPING_LINE = Array.from({ length: 120 }, (_, index) => `word${index}`).join(' ');
const POLLING_TIMEOUT_MILLISECONDS = 60_000;
/** Distance from the end of the log, in pixels, within which the log view follows new rows. */
const FOLLOWING_DISTANCE = 32;
const LOGGING_ERROR_LINE = '[LOGGING ERROR]: Failed to refresh logs.';
/** Width of the side menu a maximized log view leaves visible. */
const SIDE_MENU_WIDTH = 140;
/** Narrowest viewport at which a maximized log view leaves the side menu visible. */
const FULLSCREEN_SIDE_MENU_MINIMUM_VIEWPORT_WIDTH = 749;

test.describe('pool.pool-id.sandbox-instance.request-id log view', () => {
    let own: ChainSandbox;

    test.beforeEach(async ({ page, apiAs, shared, browserKey }) => {
        own = await locateChainSandbox(apiAs('sandboxOrganizer').sandbox, shared, readChainRecord(browserKey));
        await captureClipboardWrites(page);
        await mockStageOutputs(
            page,
            fixedOutputs({ terraform: TERRAFORM_LOG, 'networking-ansible': LONG_ANSIBLE_LOG, 'user-ansible': ANSIBLE_LOG }),
        );
    });

    async function openStage(page: Page, stage: number): Promise<LogView> {
        await page.goto(`/pool/${own.poolId}/sandbox-instance/${own.allocationRequestId}#stage-${stage}`);
        await waitForPageReady(page);
        const logView = new LogView(page);
        await expect(logView.host.locator('.cm-line').first()).toBeVisible();
        return logView;
    }

    async function reloadStage(page: Page): Promise<LogView> {
        await page.reload();
        await waitForPageReady(page);
        const logView = new LogView(page);
        await expect(logView.host.locator('.cm-line').first()).toBeVisible();
        return logView;
    }

    test.describe('syntax highlighting', () => {
        test('colours Terraform tokens with the palette slots of their kind', async ({ page, checkpoint }) => {
            const logView = await openStage(page, 1);
            await logView.expectTokenSlot('Error: Quota', 'Error:', 9);
            await logView.expectTokenSlot('Apply complete!', 'Apply complete!', 2);
            await logView.expectTokenSlot('Plan: 1 to add', 'Plan:', 4);
            await logView.expectTokenSlot('server: Creating...', 'Creating...', 3);
            await logView.expectTokenSlot('Creation complete after', '12s', 12);
            await logView.expectTokenSlot('Creation complete after', 'id=abc-123', 5);
            await logView.expectTokenSlot('name = "web-1"', '"web-1"', 2);
            expect(await logView.slotColour(9), 'error colour differs from the plain text').not.toBe(
                await logView.slotColour('foreground'),
            );
            await checkpoint(page, 'terraform highlighting');
        });

        for (const stage of [2, 3]) {
            test(`colours the Ansible tokens of stage ${stage} with the palette slots of their kind`, async ({
                page,
                checkpoint,
            }) => {
                const logView = await openStage(page, stage);
                await logView.expectTokenSlot('PLAY [all]', 'PLAY [all]', 4);
                await logView.expectTokenSlot('TASK [Gathering Facts]', 'TASK [Gathering Facts]', 12);
                await logView.expectTokenSlot('ok: [host1]', 'ok:', 2);
                await logView.expectTokenSlot('fatal: [host3]', 'fatal:', 9);
                await logView.expectTokenSlot('fatal: [host3]', 'FAILED!', 1);
                await logView.expectTokenSlot('host1                      : ok=3', 'ok=3', 2);
                await logView.expectTokenSlot('host3                      : ok=1', 'failed=1', 1);
                await logView.expectTokenSlot('host1                      : ok=3', 'changed=0', 'foreground');
                await checkpoint(page, `ansible highlighting stage ${stage}`);
            });
        }

        test('changes the colours with the highlighting level and keeps the level after a reload', async ({ page }) => {
            let logView = await openStage(page, 1);
            await expect(logView.settingsPanel()).toHaveCount(0);
            await logView.setHighlightLevel(0);
            expect(await logView.hostVariable('--log-token-error')).toBe('var(--log-foreground)');
            await logView.expectTokenSlot('Error: Quota', 'Error:', 'foreground');

            await logView.setHighlightLevel(1);
            await logView.expectTokenSlot('Error: Quota', 'Error:', 9);
            await logView.expectTokenSlot('Plan: 1 to add', 'Plan:', 'foreground');

            await logView.setHighlightLevel(2);
            await logView.expectTokenSlot('Plan: 1 to add', 'Plan:', 4);
            await logView.expectTokenSlot('Creation complete after', '12s', 12);
            await logView.expectTokenSlot('Apply complete!', 'Apply complete!', 'foreground');

            await logView.setHighlightLevel(3);
            await logView.expectTokenSlot('Apply complete!', 'Apply complete!', 2);
            expect((await logView.storedSettings())?.['highlightLevel']).toBeDefined();

            await logView.setHighlightLevel(1);
            logView = await reloadStage(page);
            await logView.expectTokenSlot('Error: Quota', 'Error:', 9);
            await logView.expectTokenSlot('Plan: 1 to add', 'Plan:', 'foreground');
            await logView.openSettings();
            await expect(logView.settingsPanel().getByRole('slider', { name: 'Highlighting level' })).toHaveValue('1');
        });
    });

    test.describe('JSON prettifying', () => {
        test('shows JSON results prettified by default and raw once Prettify JSON is turned off', async ({ page }) => {
            const logView = await openStage(page, 3);
            const prettify = logView.button('Prettify JSON');
            await expect(prettify).toHaveAttribute('aria-pressed', 'true');
            expect(await logView.renderedText()).toContain(PRETTIFIED_RESULT_LINES.join('\n'));
            await prettify.click();
            await expect(prettify).toHaveAttribute('aria-pressed', 'false');
            expect(await logView.renderedText()).toContain(RAW_RESULT_LINE);
            expect(await logView.renderedText()).not.toContain(PRETTIFIED_RESULT_LINES.join('\n'));
        });

        test('offers no Prettify JSON button on the Terraform stage', async ({ page }) => {
            const logView = await openStage(page, 1);
            await expect(logView.button('Prettify JSON')).toHaveCount(0);
        });

        test('keeps the raw setting after a reload', async ({ page }) => {
            let logView = await openStage(page, 3);
            await logView.button('Prettify JSON').click();
            logView = await reloadStage(page);
            await expect(logView.button('Prettify JSON')).toHaveAttribute('aria-pressed', 'false');
            expect(await logView.renderedText()).toContain(RAW_RESULT_LINE);
        });

        test('copies and downloads the text as it is shown in both states', async ({ page }) => {
            const logView = await openStage(page, 3);
            const prettify = logView.button('Prettify JSON');
            await logView.button('Copy to clipboard').click();
            const notification = await waitForNotification(page, 'Log copied to clipboard');
            expect(notification.kind).toBe('success');
            const prettified = (await copiedTexts(page)).at(-1)!;
            expect(prettified).toContain(PRETTIFIED_RESULT_LINES.join('\n'));
            expect(prettified).toBe(await logView.renderedText());
            const download = await captureDownload(page, () => logView.button('Download log').click());
            expect(download.fileName).toBe(`user-ansible-stage-request-${own.allocationRequestId}.log`);
            expect(download.content.trimEnd()).toBe(prettified);

            await prettify.click();
            await logView.button('Copy to clipboard').click();
            await expect.poll(async () => (await copiedTexts(page)).length).toBe(2);
            expect((await copiedTexts(page)).at(-1)).toBe(ANSIBLE_LOG);
            const rawDownload = await captureDownload(page, () => logView.button('Download log').click());
            expect(rawDownload.content.trimEnd()).toBe(ANSIBLE_LOG);
        });
    });

    test.describe('toolbar', () => {
        test('toggles line wrapping, changes how a long line is laid out and keeps the choice after a reload', async ({
            page,
        }) => {
            await page.unrouteAll({ behavior: 'ignoreErrors' });
            await mockStageOutputs(
                page,
                fixedOutputs({ terraform: LONG_WRAPPING_LINE, 'networking-ansible': '', 'user-ansible': '' }),
            );
            let logView = await openStage(page, 1);
            const wrap = logView.button('Line wrap');
            await expect(wrap).toHaveAttribute('aria-pressed', 'true');
            await expect(wrap.locator('mat-icon')).toHaveText('wrap_text');
            const wrappedHeight = (await logView.host.locator('.cm-line').first().boundingBox())!.height;
            await wrap.click();
            await expect(wrap).toHaveAttribute('aria-pressed', 'false');
            await expect(wrap.locator('mat-icon')).toHaveText('format_align_left');
            await expect
                .poll(async () => (await logView.host.locator('.cm-line').first().boundingBox())!.height)
                .toBeLessThan(wrappedHeight);
            logView = await reloadStage(page);
            await expect(logView.button('Line wrap')).toHaveAttribute('aria-pressed', 'false');
        });

        test('maximizes the log view over the page and leaves with Escape', async ({ page, checkpoint }) => {
            const logView = await openStage(page, 1);
            const fullscreen = logView.button('Fullscreen');
            await expect(fullscreen).toHaveAttribute('aria-pressed', 'false');
            await fullscreen.click();
            await expect(fullscreen).toHaveAttribute('aria-pressed', 'true');
            await expect(logView.wrapper).toHaveClass(/fullscreen/);
            await expect(logView.wrapper).toHaveAttribute('role', 'dialog');
            await expect(logView.wrapper).toHaveAttribute('aria-label', 'Log view');
            await expect(page.locator('.content-wrapper.fullscreen')).toHaveCount(1);
            const viewport = page.viewportSize()!;
            const box = (await logView.wrapper.boundingBox())!;
            const sideMenuWidth = viewport.width >= FULLSCREEN_SIDE_MENU_MINIMUM_VIEWPORT_WIDTH ? SIDE_MENU_WIDTH : 0;
            expect(box.width).toBeGreaterThanOrEqual(viewport.width - sideMenuWidth - 1);
            expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1);
            await checkpoint(page, 'log view maximized');
            await page.keyboard.press('Escape');
            await expect(logView.wrapper).not.toHaveClass(/fullscreen/);
            await expect(fullscreen).toHaveAttribute('aria-pressed', 'false');
        });

        test('keeps the maximized view when Escape closes the search panel', async ({ page }) => {
            const logView = await openStage(page, 1);
            await logView.button('Fullscreen').click();
            await logView.button('Search log').click();
            await expect(logView.searchPanel).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(logView.searchPanel).toHaveCount(0);
            await expect(logView.wrapper).toHaveClass(/fullscreen/);
            await page.keyboard.press('Escape');
            await expect(logView.wrapper).not.toHaveClass(/fullscreen/);
        });

        test('searches the log, marks the matches and closes the panel with Escape', async ({ page }) => {
            const logView = await openStage(page, 1);
            await logView.button('Search log').click();
            await expect(logView.searchPanel).toBeVisible();
            await logView.searchPanel.getByRole('textbox').first().pressSequentially('complete');
            await expect(logView.host.locator('.cm-searchMatch').first()).toBeVisible();
            expect(await logView.host.locator('.cm-searchMatch').count()).toBeGreaterThanOrEqual(2);
            await page.keyboard.press('Escape');
            await expect(logView.searchPanel).toHaveCount(0);
        });

        test('copies the log and reports it', async ({ page }) => {
            const logView = await openStage(page, 1);
            await logView.button('Copy to clipboard').click();
            expect((await waitForNotification(page, 'Log copied to clipboard')).kind).toBe('success');
            expect(await copiedTexts(page)).toEqual([TERRAFORM_LOG]);
        });

        test('downloads the log as a file named after the stage and the request', async ({ page }) => {
            const logView = await openStage(page, 1);
            const download = await captureDownload(page, () => logView.button('Download log').click());
            expect(download.fileName).toBe(`terraform-stage-request-${own.allocationRequestId}.log`);
            expect(download.content.trimEnd()).toBe(TERRAFORM_LOG);
        });

        test('opens and closes the appearance panel and returns focus to its button with Escape', async ({ page }) => {
            const logView = await openStage(page, 1);
            const gear = logView.button('Appearance settings');
            await expect(gear).toHaveAttribute('aria-expanded', 'false');
            await gear.click();
            await expect(gear).toHaveAttribute('aria-expanded', 'true');
            await expect(logView.settingsPanel()).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(logView.settingsPanel()).toHaveCount(0);
            await expect(gear).toBeFocused();
        });

        test('scrolls to the top and to the end of a long log', async ({ page }) => {
            const logView = await openStage(page, 2);
            await logView.button('Scroll to top').click();
            await expect.poll(() => logView.renderedText()).toContain('PLAY [all]');
            await logView.button('Scroll to end').click();
            await expect.poll(() => logView.renderedText()).toContain('END OF Padding LOG');
        });
    });

    test.describe('tooltips and shortcuts', () => {
        const PLATFORMS = [
            {
                name: 'Linux and Windows',
                userAgent: USER_AGENTS.linux,
                modifier: 'Control',
                top: 'Control+Home',
                end: 'Control+End',
                labels: {
                    Fullscreen: 'Alt+Shift+F',
                    'Line wrap': 'Alt+Shift+W',
                    'Copy to clipboard': 'Alt+Shift+C',
                    'Download log': 'Alt+Shift+D',
                    'Prettify JSON': 'Alt+Shift+P',
                    'Appearance settings': 'Alt+Shift+S',
                    'Search log': 'Ctrl+F',
                    'Scroll to top': 'Ctrl+Home',
                    'Scroll to end': 'Ctrl+End',
                },
            },
            {
                name: 'macOS',
                userAgent: USER_AGENTS.mac,
                modifier: 'Meta',
                top: 'Meta+ArrowUp',
                end: 'Meta+ArrowDown',
                labels: {
                    Fullscreen: '⌥⇧F',
                    'Line wrap': '⌥⇧W',
                    'Copy to clipboard': '⌥⇧C',
                    'Download log': '⌥⇧D',
                    'Prettify JSON': '⌥⇧P',
                    'Appearance settings': '⌥⇧S',
                    'Search log': '⌘F',
                    'Scroll to top': '⌘↑',
                    'Scroll to end': '⌘↓',
                },
            },
        ];

        for (const platform of PLATFORMS) {
            test.describe(platform.name, () => {
                test.use({ userAgent: platform.userAgent });

                for (const [buttonName, shortcut] of Object.entries(platform.labels)) {
                    test(`shows the ${shortcut} shortcut below the ${buttonName} button on hover and on focus`, async ({
                        page,
                    }) => {
                        const logView = await openStage(page, 2);
                        const button = logView.button(buttonName);
                        const tooltip = page.getByRole('tooltip');
                        await button.hover();
                        await expect(tooltip.locator('.tooltip-shortcut')).toHaveText(shortcut);
                        const buttonBox = (await button.boundingBox())!;
                        const tooltipBox = (await tooltip.boundingBox())!;
                        expect(tooltipBox.y).toBeGreaterThanOrEqual(buttonBox.y + buttonBox.height - 1);
                        await expect(button).toHaveAttribute('aria-describedby', /.+/);
                        await page.mouse.move(0, 0);
                        await expect(tooltip).toHaveCount(0);
                        await logView.focusWithKeyboard(buttonName);
                        await expect(tooltip.locator('.tooltip-shortcut')).toHaveText(shortcut);
                    });
                }

                test('runs the toolbar actions from the keyboard while focus is inside the log view', async ({
                    page,
                }) => {
                    const logView = await openStage(page, 2);
                    await logView.focusToolbar();

                    await page.keyboard.press('Alt+Shift+W');
                    await expect(logView.button('Line wrap')).toHaveAttribute('aria-pressed', 'false');
                    await page.keyboard.press('Alt+Shift+P');
                    await expect(logView.button('Prettify JSON')).toHaveAttribute('aria-pressed', 'false');
                    await page.keyboard.press('Alt+Shift+C');
                    await expect.poll(async () => (await copiedTexts(page)).length).toBe(1);
                    const download = await captureDownload(page, () => page.keyboard.press('Alt+Shift+D'));
                    expect(download.fileName).toBe(`networking-ansible-stage-request-${own.allocationRequestId}.log`);
                    await page.keyboard.press('Alt+Shift+S');
                    await expect(logView.button('Appearance settings')).toHaveAttribute('aria-expanded', 'true');
                    await page.keyboard.press('Alt+Shift+S');
                    await expect(logView.button('Appearance settings')).toHaveAttribute('aria-expanded', 'false');
                    await page.keyboard.press('Alt+Shift+F');
                    await expect(logView.button('Fullscreen')).toHaveAttribute('aria-pressed', 'true');
                    await page.keyboard.press('Alt+Shift+F');
                    await expect(logView.button('Fullscreen')).toHaveAttribute('aria-pressed', 'false');

                    await logView.focusToolbar();
                    await page.keyboard.press(platform.top);
                    await expect.poll(() => logView.renderedText()).toContain('PLAY [all]');
                    await logView.focusToolbar();
                    await page.keyboard.press(platform.end);
                    await expect.poll(() => logView.renderedText()).toContain('END OF Padding LOG');
                    await logView.focusToolbar();
                    await page.keyboard.press(`${platform.modifier}+F`);
                    await expect(logView.searchPanel).toBeVisible();
                });

                test('runs the shortcuts while focus is elsewhere on the page', async ({ page }) => {
                    const logView = await openStage(page, 2);
                    await page.locator('.stage-indicators').getByRole('button').first().focus();
                    await page.keyboard.press('Alt+Shift+W');
                    await expect(logView.button('Line wrap')).toHaveAttribute('aria-pressed', 'false');
                });
            });
        }
    });

    test.describe('appearance panel', () => {
        test('lists the presets by group and applies a chosen preset to every log view', async ({ page }) => {
            const logView = await openStage(page, 2);
            const views = ([0, 1, 2] as const).map((position) => new LogView(page, position));
            await logView.openSettings();
            const presets = logView.settingsPanel().getByRole('listbox', { name: 'Colour preset' });
            for (const heading of ['Platform', 'Other - light', 'Other - dark']) {
                await expect(presets).toContainText(heading);
            }
            for (const option of ['Platform light', 'Platform dark', 'High contrast dark']) {
                await expect(presets.getByRole('option', { name: option })).toBeVisible();
            }
            const lightBackground = await logView.hostVariable('--log-background');
            await presets.getByRole('option', { name: 'Platform dark' }).click();
            for (const view of views) {
                await expect.poll(() => view.colourScheme()).toBe('dark');
            }
            expect(await logView.hostVariable('--log-background')).not.toBe(lightBackground);
            expect((await logView.storedSettings())?.['presetId']).toBe('platform-dark');
            await presets.getByRole('option', { name: 'Platform light' }).click();
            for (const view of views) {
                await expect.poll(() => view.colourScheme()).toBe('light');
            }
        });

        test('changes font size and weight with their sliders', async ({ page }) => {
            const logView = await openStage(page, 1);
            await logView.openSettings();
            const size = logView.settingsPanel().getByRole('slider', { name: 'Font size' });
            await expect(size).toHaveValue('14');
            await expect(logView.settingsPanel()).toContainText('14 px');
            await size.focus();
            await size.press('ArrowRight');
            await size.press('ArrowRight');
            await expect(size).toHaveValue('16');
            await expect(logView.settingsPanel()).toContainText('16 px');
            await expect(logView.content).toHaveCSS('font-size', '16px');
            const weight = logView.settingsPanel().getByRole('slider', { name: 'Font weight' });
            await weight.focus();
            await weight.press('ArrowRight');
            await expect(weight).toHaveValue('500');
            await expect(logView.content).toHaveCSS('font-weight', '500');
        });

        test('changes the font family', async ({ page }) => {
            const logView = await openStage(page, 1);
            await logView.openSettings();
            const select = logView.settingsPanel().getByRole('combobox', { name: 'Font family' });
            await expect(select).toContainText('Roboto Mono');
            const before = await logView.hostVariable('--log-font-family');
            await select.click();
            const options = page.getByRole('listbox', { name: 'Font family' }).getByRole('option');
            await expect.poll(() => options.count()).toBeGreaterThan(1);
            const chosen = options.filter({ hasNotText: 'Roboto Mono' }).first();
            const chosenName = (await chosen.innerText()).trim();
            await chosen.click();
            await expect(select).toContainText(chosenName);
            expect(await logView.hostVariable('--log-font-family')).not.toBe(before);
            expect(await logView.hostVariable('--log-font-family')).toContain(chosenName);
        });

        test('keeps every appearance choice after a reload and restores the defaults with the reset button', async ({
            page,
        }) => {
            let logView = await openStage(page, 2);
            const defaults = {
                background: await logView.hostVariable('--log-background'),
                size: await logView.hostVariable('--log-font-size'),
                weight: await logView.hostVariable('--log-font-weight'),
            };
            await logView.openSettings();
            await logView.settingsPanel().getByRole('option', { name: 'Platform dark' }).click();
            const size = logView.settingsPanel().getByRole('slider', { name: 'Font size' });
            await size.focus();
            await size.press('End');
            const weight = logView.settingsPanel().getByRole('slider', { name: 'Font weight' });
            await weight.focus();
            await weight.press('Home');
            await logView.setHighlightLevel(2);
            await logView.button('Line wrap').click();
            const changed = {
                background: await logView.hostVariable('--log-background'),
                size: await logView.hostVariable('--log-font-size'),
                weight: await logView.hostVariable('--log-font-weight'),
            };
            expect(changed.background).not.toBe(defaults.background);
            expect(changed.size).not.toBe(defaults.size);
            expect(changed.weight).not.toBe(defaults.weight);

            logView = await reloadStage(page);
            expect(await logView.hostVariable('--log-background')).toBe(changed.background);
            expect(await logView.hostVariable('--log-font-size')).toBe(changed.size);
            expect(await logView.hostVariable('--log-font-weight')).toBe(changed.weight);
            await expect(logView.button('Line wrap')).toHaveAttribute('aria-pressed', 'false');
            await logView.openSettings();
            await expect(logView.settingsPanel().getByRole('slider', { name: 'Highlighting level' })).toHaveValue('2');

            await logView.settingsPanel().getByRole('button', { name: 'Reset to defaults' }).click();
            await expect.poll(() => logView.hostVariable('--log-background')).toBe(defaults.background);
            expect(await logView.hostVariable('--log-font-size')).toBe(defaults.size);
            expect(await logView.hostVariable('--log-font-weight')).toBe(defaults.weight);
            await expect(logView.settingsPanel().getByRole('slider', { name: 'Highlighting level' })).toHaveValue('3');
            await expect(logView.button('Line wrap')).toHaveAttribute('aria-pressed', 'false');
        });
    });

    test.describe('loading skeleton', () => {
        test('shows row placeholders while the output is on its way and replaces them with the text', async ({
            page,
        }) => {
            await page.unrouteAll({ behavior: 'ignoreErrors' });
            let release!: () => void;
            const gate = new Promise<void>((resolve) => (release = resolve));
            await mockStageOutputs(page, async ({ fromRow }) => {
                await gate;
                return { content: fromRow === 0 ? TERRAFORM_LOG : '', rows: TERRAFORM_LOG.split('\n').length };
            });
            await page.goto(`/pool/${own.poolId}/sandbox-instance/${own.allocationRequestId}#stage-1`);
            const logView = new LogView(page);
            await expect(logView.host.locator('crczp-log-view-skeleton .skeleton-row:not(.skeleton-row--pending)').first()).toBeVisible();
            await expect(logView.content).toHaveAttribute('aria-busy', 'true');
            await expect(logView.button('Copy to clipboard')).toBeDisabled();
            await expect(logView.button('Search log')).toBeDisabled();
            release();
            await expect(logView.host.locator('crczp-log-view-skeleton')).toHaveCount(0);
            await expect(logView.host.locator('.cm-line', { hasText: 'Quota exceeded' })).toBeVisible();
            await expect(logView.button('Copy to clipboard')).toBeEnabled();
        });
    });

    test.describe('polling a running stage', () => {
        test('appends new rows without moving a scrolled-up reader, reports a failure streak once and clears its error line on the next success', async ({
            page,
        }) => {
            test.setTimeout(180_000);
            await page.unrouteAll({ behavior: 'ignoreErrors' });
            const opened = numberedLog('Poll', 400);
            const rowsAppended = createGate();
            const firstFailure = createGate();
            const recovery = createGate();
            const recoveryRequested = createGate();
            await mockStageOutputs(page, async ({ callIndex }) => {
                switch (callIndex) {
                    case 0:
                        return { content: opened, rows: 400 };
                    case 1:
                        await rowsAppended.promise;
                        return { content: 'EXTRA row A\nEXTRA row B', rows: 402 };
                    case 2:
                        await firstFailure.promise;
                        return 'fail';
                    case 3:
                        return 'fail';
                    case 4:
                        recoveryRequested.resolve();
                        await recovery.promise;
                        return { content: '', rows: 402 };
                    default:
                        return { content: '', rows: 402 };
                }
            });
            await mockRunningStage(page, 'terraform');
            const logView = await openStage(page, 1);

            async function copiedNow(): Promise<string> {
                const before = (await copiedTexts(page)).length;
                await logView.button('Copy to clipboard').click();
                await expect.poll(async () => (await copiedTexts(page)).length).toBe(before + 1);
                return (await copiedTexts(page)).at(-1)!;
            }
            const distanceFromEnd = () =>
                logView.scroller.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight);

            await expect.poll(distanceFromEnd, { message: 'the opened log shows its end' }).toBeLessThanOrEqual(FOLLOWING_DISTANCE);
            await logView.scroller.evaluate((element) => (element.scrollTop = 2000));
            await expect.poll(() => logView.topLine()).toMatch(/^Poll line \d{4}$/);
            expect(await logView.topLine()).not.toBe('Poll line 0001');
            expect(await distanceFromEnd(), 'the reader left the end of the log').toBeGreaterThan(FOLLOWING_DISTANCE);
            const topLine = await logView.topLine();
            const scrollTop = await logView.scroller.evaluate((element) => element.scrollTop);

            rowsAppended.resolve();
            await expect
                .poll(copiedNow, { timeout: POLLING_TIMEOUT_MILLISECONDS })
                .toMatch(/EXTRA row B$/);
            expect(await logView.topLine()).toBe(topLine);
            expect(await logView.scroller.evaluate((element) => element.scrollTop)).toBe(scrollTop);

            firstFailure.resolve();
            await expect(errorDialog(page)).toBeVisible({ timeout: POLLING_TIMEOUT_MILLISECONDS });
            await dismissErrorDialog(page);
            await expect(errorDialog(page)).toHaveCount(0);
            await recoveryRequested.promise;
            await expect(errorDialog(page), 'the second failure in a row opens no dialog').toHaveCount(0);
            expect((await copiedNow()).split(LOGGING_ERROR_LINE).length - 1).toBe(1);

            recovery.resolve();
            await expect
                .poll(copiedNow, { timeout: POLLING_TIMEOUT_MILLISECONDS })
                .not.toContain(LOGGING_ERROR_LINE);
            expect(await logView.topLine()).toBe(topLine);
        });
    });

    test.describe('carousel', () => {
        const stageLogs = {
            terraform: numberedLog('Stage 1', 300),
            'networking-ansible': numberedLog('Stage 2', 300),
            'user-ansible': numberedLog('Stage 3', 300),
        } satisfies Record<StageKind, string>;

        test.beforeEach(async ({ page }) => {
            await page.unrouteAll({ behavior: 'ignoreErrors' });
            await mockStageOutputs(page, fixedOutputs(stageLogs));
        });

        test('shows the end of a log that was hidden when it is revealed, in both directions and across the wrap', async ({
            page,
        }) => {
            await openStage(page, 1);
            const centre = new LogView(page);
            await page.keyboard.press('ArrowRight');
            await expect(page).toHaveURL(/#stage-2$/);
            await expect.poll(() => centre.renderedText()).toContain('END OF Stage 2 LOG');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await expect(page).toHaveURL(/#stage-3$/);
            await expect.poll(() => centre.renderedText()).toContain('END OF Stage 3 LOG');
            await page.keyboard.press('ArrowLeft');
            await expect(page).toHaveURL(/#stage-2$/);
            await expect.poll(() => centre.renderedText()).toContain('END OF Stage 2 LOG');
        });

        for (const { start, away, back } of [
            { start: 2, away: 'ArrowRight', back: 'ArrowLeft' },
            { start: 2, away: 'ArrowLeft', back: 'ArrowRight' },
            { start: 1, away: 'ArrowRight', back: 'ArrowLeft' },
            { start: 3, away: 'ArrowLeft', back: 'ArrowRight' },
        ]) {
            test(`keeps the reading position of a scrolled-up log of stage ${start} after ${away} and ${back}`, async ({
                page,
            }) => {
                const logView = await openStage(page, start);
                await logView.scroller.evaluate((element) => (element.scrollTop = 1500));
                await expect.poll(() => logView.topLine()).not.toContain('line 0001');
                const topLine = await logView.topLine();
                await page.keyboard.press(away);
                await expect(page).not.toHaveURL(new RegExp(`#stage-${start}$`));
                await page.keyboard.press(back);
                await expect(page).toHaveURL(new RegExp(`#stage-${start}$`));
                await expect.poll(() => logView.topLine()).toBe(topLine);
            });
        }
    });

    test('sends the Left and Right arrows of the font size slider to the slider, not to the carousel', async ({
        page,
    }) => {
        const logView = await openStage(page, 2);
        await logView.openSettings();
        const size = logView.settingsPanel().getByRole('slider', { name: 'Font size' });
        await size.focus();
        await size.press('ArrowRight');
        await expect(size).toHaveValue('15');
        await expect(page).toHaveURL(/#stage-2$/);
    });
});

interface Gate {
    promise: Promise<void>;
    resolve: () => void;
}

function createGate(): Gate {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => (resolve = done));
    return { promise, resolve };
}
