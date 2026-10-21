import { expect, type Locator, type Page } from '@playwright/test';
import type { TextMatcher } from './scope';

/** Kinds of Sentinel notification. */
export type NotificationKind = 'success' | 'error' | 'info' | 'warning';

/** A notification found on the page. */
export interface ObservedNotification {
    kind: NotificationKind;
    /** Visible text of the popup, or of the error dialog's title and messages. */
    text: string;
}

const POPUP_KINDS: readonly NotificationKind[] = ['success', 'info', 'warning'];

/**
 * Popups of non-error notifications: Sentinel renders them in a Material snack bar that closes on
 * its own after a few seconds, one entry per notification, the kind as a class of the entry. Only
 * the notification's title is shown, shortened to 50 characters.
 */
export function notificationPopups(page: Page): Locator {
    return page.locator('.sentinel-popup-notification');
}

/**
 * The modal dialog Sentinel opens for an error notification: the title names the failed
 * operation, the paragraphs carry the messages, OK closes it.
 */
export function errorDialog(page: Page): Locator {
    return page.locator('[data-cy="sentinel-error-dialog"]');
}

/** Closes the error dialog with its OK button. */
export async function dismissErrorDialog(page: Page): Promise<void> {
    await errorDialog(page).getByRole('button', { name: 'OK', exact: true }).click();
}

/** Time in which an error dialog is waited for after a page loaded. */
const ERROR_DIALOG_APPEARANCE_MILLISECONDS = 8_000;
/** Time in which a further error dialog is waited for once one was closed. */
const ERROR_DIALOG_FOLLOW_UP_MILLISECONDS = 1_500;

/**
 * Closes every error dialog that opens within a window after a page loaded, so a page whose
 * background requests fail stays usable. Resolves with how many dialogs were closed.
 */
export async function dismissErrorDialogs(
    page: Page,
    options: { within?: number } = {},
): Promise<number> {
    let dismissed = 0;
    let patience = options.within ?? ERROR_DIALOG_APPEARANCE_MILLISECONDS;
    for (;;) {
        const appeared = await errorDialog(page)
            .first()
            .waitFor({ state: 'visible', timeout: patience })
            .then(() => true)
            .catch(() => false);
        if (!appeared) {
            return dismissed;
        }
        await dismissErrorDialog(page);
        await errorDialog(page).first().waitFor({ state: 'hidden' });
        dismissed++;
        patience = ERROR_DIALOG_FOLLOW_UP_MILLISECONDS;
    }
}

/** Expects that no error dialog opens within the window after a page loaded; `within` is that window in milliseconds. */
export async function expectNoErrorDialog(page: Page, options: { within?: number } = {}): Promise<void> {
    expect(await dismissErrorDialogs(page, options), 'error dialogs that opened').toBe(0);
}

/**
 * Waits for a notification whose text matches and reports its kind. Errors surface as the error
 * dialog, every other kind as a popup. Throws when none appears within the expect timeout.
 */
export async function waitForNotification(
    page: Page,
    text: TextMatcher,
    options: { timeout?: number } = {},
): Promise<ObservedNotification> {
    const popup = notificationPopups(page).filter({ hasText: text }).first();
    const dialog = errorDialog(page).filter({ hasText: text }).first();
    await popup.or(dialog).waitFor(options);
    if (await dialog.isVisible()) {
        return { kind: 'error', text: (await dialog.innerText()).trim() };
    }
    const classes = (await popup.getAttribute('class')) ?? '';
    const kind = POPUP_KINDS.find((candidate) => classes.split(/\s+/).includes(candidate)) ?? 'info';
    return { kind, text: (await popup.innerText()).trim() };
}
