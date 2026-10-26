import type { Locator, Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';

/** Allocation stage kinds as they appear in the outputs URL, in carousel order. */
export const STAGE_KINDS = ['terraform', 'networking-ansible', 'user-ansible'] as const;
export type StageKind = (typeof STAGE_KINDS)[number];

/** Answer to one outputs request: the new rows, or a failed request. */
export type OutputReply = { content: string; rows: number } | 'fail';

/** One outputs request as the stage view sends it. */
export interface OutputRequest {
    kind: StageKind;
    /** First row the view asks for; 0 for the first request. */
    fromRow: number;
    /** Zero-based count of earlier outputs requests for the same stage kind. */
    callIndex: number;
}

export type OutputResponder = (request: OutputRequest) => OutputReply | Promise<OutputReply>;

const OUTPUTS_URL = /\/allocation-requests\/\d+\/stages\/(terraform|networking-ansible|user-ansible)\/outputs(\?|$)/;
const STAGE_URL = /\/allocation-requests\/\d+\/stages\/(terraform|networking-ansible|user-ansible)$/;

/** Number of rows the backend reports for a log text. */
export function rowCount(text: string): number {
    return text === '' ? 0 : text.split('\n').length;
}

/** Builds a log of numbered lines whose last line names the stage and closes the log. */
export function numberedLog(label: string, lines: number): string {
    return [
        ...Array.from({ length: lines - 1 }, (_, index) => `${label} line ${String(index + 1).padStart(4, '0')}`),
        `END OF ${label} LOG`,
    ].join('\n');
}

/** Answers every outputs request of a stage with its whole log on the first request and nothing new after it. */
export function fixedOutputs(logs: Record<StageKind, string>): OutputResponder {
    return ({ kind, fromRow }) => ({
        content: fromRow === 0 ? logs[kind] : '',
        rows: rowCount(logs[kind]),
    });
}

/**
 * Replaces the backend answers to the outputs requests of all three stage kinds with the
 * responder's replies. Install it before the page opens.
 */
export async function mockStageOutputs(page: Page, responder: OutputResponder): Promise<void> {
    const callCounts = new Map<StageKind, number>();
    await page.route(OUTPUTS_URL, async (route) => {
        const url = new URL(route.request().url());
        const kind = OUTPUTS_URL.exec(url.pathname + url.search)?.[1] as StageKind;
        const callIndex = callCounts.get(kind) ?? 0;
        callCounts.set(kind, callIndex + 1);
        const reply = await responder({ kind, fromRow: Number(url.searchParams.get('from_row') ?? 0), callIndex });
        await fulfilWithCors(route, reply === 'fail' ? { status: 500, body: '{}' } : { status: 200, body: JSON.stringify(reply) });
    });
}

/** Makes the backend report a stage kind as running, so the stage view keeps polling its outputs. */
export async function mockRunningStage(page: Page, kind: StageKind): Promise<void> {
    await page.route(STAGE_URL, async (route) => {
        if (!route.request().url().endsWith(`/${kind}`)) {
            return route.fallback();
        }
        const response = await route.fetch();
        const stage = (await response.json()) as Record<string, unknown>;
        return fulfilWithCors(route, { status: 200, body: JSON.stringify({ ...stage, end: null, failed: false }) });
    });
}

async function fulfilWithCors(route: Route, answer: { status: number; body: string }): Promise<void> {
    const origin = (await route.request().headerValue('origin')) ?? '*';
    await route.fulfill({
        status: answer.status,
        contentType: 'application/json',
        body: answer.body,
        headers: {
            'access-control-allow-origin': origin,
            'access-control-allow-credentials': 'true',
            vary: 'Origin',
        },
    });
}

/** Position of a carousel slide: 0 left, 1 centre, 2 right. */
export type SlidePosition = 0 | 1 | 2;

/** The log view of one carousel slide and the controls around it. */
export class LogView {
    readonly host: Locator;
    readonly wrapper: Locator;
    readonly editor: Locator;
    readonly content: Locator;
    readonly scroller: Locator;
    readonly searchPanel: Locator;

    constructor(readonly page: Page, position: SlidePosition = 1) {
        this.host = page.locator(`.carousel-item[data-position="${position}"] crczp-log-view`);
        this.wrapper = this.host.locator('.content-wrapper');
        this.editor = this.host.locator('.cm-editor');
        this.content = this.host.locator('.cm-content');
        this.scroller = this.host.locator('.cm-scroller');
        this.searchPanel = this.host.locator('.cm-search');
    }

    /** A toolbar button by its accessible name. */
    button(name: string): Locator {
        return this.host.getByRole('button', { name, exact: true });
    }

    /** The text of the lines the editor currently renders, joined by line breaks. */
    async renderedText(): Promise<string> {
        return (await this.host.locator('.cm-line').allInnerTexts()).join('\n');
    }

    /** The text of the first rendered line that reaches into the scroller's visible area. */
    topLine(): Promise<string> {
        return this.scroller.evaluate((scroller) => {
            const scrollerTop = scroller.getBoundingClientRect().top;
            const visibleLine = Array.from(scroller.querySelectorAll('.cm-line')).find(
                (line) => line.getBoundingClientRect().bottom > scrollerTop + 1,
            );
            return (visibleLine?.textContent ?? '').trim();
        });
    }

    /** Moves keyboard focus to a toolbar button inside the log view. */
    async focusToolbar(): Promise<void> {
        await this.button('Line wrap').focus();
    }

    /** Gives a toolbar button keyboard-origin focus by focusing it, then tabbing away from it and back. */
    async focusWithKeyboard(name: string): Promise<void> {
        await this.button(name).focus();
        await this.page.keyboard.press('Shift+Tab');
        await this.page.keyboard.press('Tab');
        await expect(this.button(name)).toBeFocused();
    }

    /** Value of an inline custom property the host carries, such as `--log-token-error`. */
    hostVariable(name: string): Promise<string> {
        return this.host.evaluate((element, property) => element.style.getPropertyValue(property).trim(), name);
    }

    /** The host's `color-scheme`. */
    colourScheme(): Promise<string> {
        return this.host.evaluate((element) => element.style.colorScheme);
    }

    /** Resolved colour of a palette slot, or of the plain foreground. */
    slotColour(slot: number | 'foreground'): Promise<string> {
        return this.host.evaluate((element, which) => {
            const probe = document.createElement('span');
            probe.style.color = which === 'foreground' ? 'var(--log-foreground)' : `var(--log-ansi-${which})`;
            element.appendChild(probe);
            const colour = getComputedStyle(probe).color;
            probe.remove();
            return colour;
        }, slot);
    }

    /** Computed colour of the first occurrence of a token inside the first rendered line containing a text. */
    tokenColour(lineText: string, token: string): Promise<string> {
        return this.host.evaluate(
            (element, [line, wanted]) => {
                const lines = Array.from(element.querySelectorAll('.cm-line'));
                const row = lines.find((candidate) => candidate.textContent?.includes(line!));
                if (!row) {
                    throw new Error(`No rendered line contains "${line}"`);
                }
                const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
                for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                    if (node.textContent?.includes(wanted!) && node.parentElement) {
                        return getComputedStyle(node.parentElement).color;
                    }
                }
                throw new Error(`No text node of the line "${line}" contains the token "${wanted}"`);
            },
            [lineText, token],
        );
    }

    /** Scrolls the log to its top, then asserts that a token is drawn in a palette slot's colour once the view has settled. */
    async expectTokenSlot(lineText: string, token: string, slot: number | 'foreground'): Promise<void> {
        await this.button('Scroll to top').click();
        const expectedColour = await this.slotColour(slot);
        await expect
            .poll(() => this.tokenColour(lineText, token), { message: `colour of "${token}"` })
            .toBe(expectedColour);
    }

    /** Whether the line wrapping is on, read from the pressed state of its button. */
    async isWrapping(): Promise<boolean> {
        return (await this.button('Line wrap').getAttribute('aria-pressed')) === 'true';
    }

    /** The settings panel, which only exists while it is open. */
    settingsPanel(): Locator {
        return this.page.locator('#log-view-settings');
    }

    async openSettings(): Promise<void> {
        if ((await this.button('Appearance settings').getAttribute('aria-expanded')) !== 'true') {
            await this.button('Appearance settings').click();
        }
        await expect(this.settingsPanel()).toBeVisible();
    }

    /** Sets the highlighting level slider, 0 None to 3 Full, with the keyboard. */
    async setHighlightLevel(index: 0 | 1 | 2 | 3): Promise<void> {
        await this.openSettings();
        const slider = this.settingsPanel().getByRole('slider', { name: 'Highlighting level' });
        await slider.focus();
        await slider.press('Home');
        for (let step = 0; step < index; step++) {
            await slider.press('ArrowRight');
        }
        await expect(slider).toHaveValue(String(index));
    }

    /** The stored log view preferences, or null when nothing is stored yet. */
    storedSettings(): Promise<Record<string, unknown> | null> {
        return this.page.evaluate(() => {
            const stored = localStorage.getItem('crczp-log-view-settings');
            return stored === null ? null : (JSON.parse(stored) as Record<string, unknown>);
        });
    }
}

/** Replaces `navigator.clipboard.writeText` so that copied text can be read in every browser. */
export async function captureClipboardWrites(page: Page): Promise<void> {
    await page.addInitScript(() => {
        const writes: string[] = [];
        (window as unknown as { clipboardWrites: string[] }).clipboardWrites = writes;
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: (text: string) => Promise.resolve(void writes.push(text)) },
        });
    });
}

/** Texts copied since the page opened, oldest first; needs {@link captureClipboardWrites}. */
export function copiedTexts(page: Page): Promise<string[]> {
    return page.evaluate(() => (window as unknown as { clipboardWrites: string[] }).clipboardWrites);
}

/** User agent strings that make the app pick the shortcut set of a platform. */
export const USER_AGENTS = {
    linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
} as const;

export const TERRAFORM_LOG = [
    'Error: Quota exceeded',
    'Apply complete! Resources: 1 added, 0 changed, 0 destroyed.',
    'Plan: 1 to add, 0 to change, 0 to destroy.',
    'openstack_compute_instance_v2.server: Creating...',
    'openstack_compute_instance_v2.server: Creation complete after 12s [id=abc-123]',
    '  + name = "web-1"',
].join('\n');

export const ANSIBLE_LOG = [
    'PLAY [all] ***************************',
    'TASK [Gathering Facts] ***************',
    'ok: [host1]',
    'fatal: [host3]: FAILED! => {"msg": "boom", "failed": true}',
    'ok: [host1] => {"changed": false, "msg": "done"}',
    'PLAY RECAP ***************************',
    'host1                      : ok=3    changed=0    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0',
    'host3                      : ok=1    changed=0    unreachable=0    failed=1    skipped=0    rescued=0    ignored=0',
].join('\n');

/** The prettified form of the JSON payload line of {@link ANSIBLE_LOG}. */
export const PRETTIFIED_RESULT_LINES = ['ok: [host1] => {', '  "changed": false,', '  "msg": "done"', '}'];
