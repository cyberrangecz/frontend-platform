import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { FullConfig, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

interface ImmediateFailureOptions {
    logFile?: string;
}

const ANSI_ESCAPE = /\u001b\[[0-9;]*m/g;

/**
 * Reports every failed attempt the moment its test ends: the error goes to standard error and,
 * with `logFile` set, is appended to that file as plain text.
 */
export default class ImmediateFailureReporter implements Reporter {
    constructor(private readonly options: ImmediateFailureOptions = {}) {}

    onBegin(_config: FullConfig): void {
        if (this.options.logFile) {
            mkdirSync(dirname(this.options.logFile), { recursive: true });
            writeFileSync(this.options.logFile, '');
        }
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        if (result.status === 'passed' || result.status === 'skipped') {
            return;
        }
        const title = test.titlePath().slice(1).join(' > ');
        const location = `${test.location.file}:${test.location.line}`;
        const errors = result.errors.map((error) => error.stack ?? error.message ?? '').join('\n\n');
        const entry = [
            '',
            `FAILED (${result.status}, attempt ${result.retry + 1}): ${title}`,
            `  at ${location}`,
            errors,
            '',
        ].join('\n');
        console.error(entry);
        if (this.options.logFile) {
            appendFileSync(this.options.logFile, entry.replace(ANSI_ESCAPE, '') + '\n');
        }
    }

    printsToStdio(): boolean {
        return false;
    }
}
