import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

const INFRASTRUCTURE_ANNOTATION = 'infrastructure outage';

interface RetriedTest {
    test: TestCase;
    retries: number;
    outcome: string;
}

/**
 * Prints, once the run ends, a warning for every test that needed retries to finish (its final
 * outcome and retry count) and every infrastructure outage a test waited out.
 */
export default class RetryWarningReporter implements Reporter {
    private readonly retriedTests = new Map<string, RetriedTest>();
    private readonly outages: { test: TestCase; description: string }[] = [];

    onTestEnd(test: TestCase, result: TestResult): void {
        if (result.retry > 0) {
            this.retriedTests.set(test.id, {
                test,
                retries: result.retry,
                outcome: result.status,
            });
        }
        for (const annotation of test.annotations) {
            const alreadyListed = this.outages.some(
                (outage) => outage.test === test && outage.description === annotation.description,
            );
            if (annotation.type === INFRASTRUCTURE_ANNOTATION && !alreadyListed) {
                this.outages.push({ test, description: annotation.description ?? '' });
            }
        }
    }

    onEnd(): void {
        if (this.retriedTests.size === 0 && this.outages.length === 0) {
            return;
        }
        const lines = ['', 'WARNING: tests that needed attention'];
        if (this.retriedTests.size > 0) {
            lines.push(`  ${this.retriedTests.size} test(s) needed retries:`);
            for (const { test, retries, outcome } of this.retriedTests.values()) {
                lines.push(`    - ${retries} ${retries === 1 ? 'retry' : 'retries'}, ${outcome}: ${test.titlePath().slice(1).join(' > ')}`);
            }
        }
        if (this.outages.length > 0) {
            lines.push(`  ${this.outages.length} infrastructure outage(s) waited out:`);
            for (const { test, description } of this.outages) {
                lines.push(`    - ${test.titlePath().slice(1).join(' > ')}: ${description}`);
            }
        }
        console.warn(lines.join('\n'));
    }
}
