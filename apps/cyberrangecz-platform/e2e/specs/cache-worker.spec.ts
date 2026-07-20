import { expect, test } from '@playwright/test';

/**
 * The OPFS failure the migration exists to eliminate: a fatal access-handle
 * error on the SAHPool, or the IndexedDB "connection is closing" race.
 */
const FATAL_STORAGE_ERROR = /NoModificationAllowedError|connection is closing|IDBDatabase/i;

const BOOT_TIMEOUT = 30_000;

test.describe('SQLite cache worker — reliability gate', () => {
    test('boots the worker and round-trips an insert then query over the RPC', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByTestId('status')).toHaveText('read-ok', { timeout: BOOT_TIMEOUT });

        await page.getByTestId('erase').click();
        await expect(page.getByTestId('count')).toHaveText('0');

        await page.getByTestId('insert').click();
        await expect(page.getByTestId('count')).toHaveText('3', { timeout: BOOT_TIMEOUT });
        await expect(page.getByTestId('error')).toHaveText('');
    });

    test('persists cached rows across a full page reload (OPFS durability)', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByTestId('status')).toHaveText('read-ok', { timeout: BOOT_TIMEOUT });

        await page.getByTestId('erase').click();
        await expect(page.getByTestId('count')).toHaveText('0');
        await page.getByTestId('insert').click();
        await expect(page.getByTestId('count')).toHaveText('3');

        await page.reload();
        await expect(page.getByTestId('status')).toHaveText('read-ok', { timeout: BOOT_TIMEOUT });
        await expect(page.getByTestId('count')).toHaveText('3');
    });

    test('survives rapid overlapping reloads colliding on OPFS handle acquisition', async ({ page }) => {
        const fatalConsole: string[] = [];
        page.on('console', (message) => {
            if (FATAL_STORAGE_ERROR.test(message.text())) {
                fatalConsole.push(message.text());
            }
        });
        page.on('pageerror', (error) => {
            if (FATAL_STORAGE_ERROR.test(error.message)) {
                fatalConsole.push(error.message);
            }
        });

        await page.goto('/');
        await expect(page.getByTestId('status')).toHaveText('read-ok', { timeout: BOOT_TIMEOUT });
        await page.getByTestId('erase').click();
        await expect(page.getByTestId('count')).toHaveText('0');
        await page.getByTestId('insert').click();
        await expect(page.getByTestId('count')).toHaveText('3');

        // Reload repeatedly WITHOUT waiting for boot to finish. The sub-boot delay lets each new
        // worker begin SAHPool acquisition; the next reload then terminates it mid-acquisition, so
        // its OPFS handles are not yet released when the following worker tries to acquire them —
        // the exact collision the acquisition retry/backoff exists to absorb. Were that retry
        // removed, a collision would surface as a NoModificationAllowedError and fail this test.
        for (let reload = 0; reload < 10; reload += 1) {
            await page.reload({ waitUntil: 'commit' });
            await page.waitForTimeout(250);
        }

        // The worker must recover after the storm: render the persisted data and surface no error.
        // The error div carries the worker's error name (e.g. "NoModificationAllowedError: …"),
        // making a leaked OPFS failure a deterministic, not console-dependent, failure signal.
        await expect(page.getByTestId('status')).toHaveText('read-ok', { timeout: BOOT_TIMEOUT });
        const probeError = (await page.getByTestId('error').textContent()) ?? '';
        expect(probeError, `probe surfaced error: ${probeError}`).not.toMatch(FATAL_STORAGE_ERROR);
        await expect(page.getByTestId('error')).toHaveText('');
        const persisted = Number((await page.getByTestId('count').textContent()) ?? '0');
        expect(persisted, 'cached rows lost across reload storm').toBeGreaterThanOrEqual(3);
        expect(
            fatalConsole,
            `Fatal OPFS/storage errors observed in console:\n${fatalConsole.join('\n')}`,
        ).toHaveLength(0);
    });
});
