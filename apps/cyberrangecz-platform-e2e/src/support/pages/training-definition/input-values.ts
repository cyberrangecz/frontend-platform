import { expect, type Locator } from '@playwright/test';

/** Retries until the inputs the locator matches hold exactly these values, in document order. */
export async function expectInputValues(inputs: Locator, expected: readonly string[]): Promise<void> {
    await expect
        .poll(() =>
            inputs.evaluateAll((elements) =>
                elements.map((element) => (element as HTMLInputElement | HTMLTextAreaElement).value),
            ),
        )
        .toEqual(expected);
}
