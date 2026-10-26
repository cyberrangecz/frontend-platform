import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const SUITE_OUTPUT_ROOT = resolve(__dirname, '../../../../dist/.playwright/apps/cyberrangecz-platform-e2e');
const PREVIOUS_RUN_FOLDERS = ['test-output', 'report', 'slideshow'];

/** Deletes the failure folders, HTML report and slideshow left behind by earlier suite runs. */
export function removePreviousRunOutput(): void {
    for (const folder of PREVIOUS_RUN_FOLDERS) {
        rmSync(resolve(SUITE_OUTPUT_ROOT, folder), { recursive: true, force: true });
    }
}
