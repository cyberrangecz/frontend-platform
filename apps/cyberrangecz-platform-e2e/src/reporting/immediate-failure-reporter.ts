import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { FullConfig, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { failedStepsOf, formatFailedStep, stripAnsi } from './step-outcomes';

interface ImmediateFailureOptions {
    /** Plain-text file receiving the failures, relative to the config. */
    logFile?: string;
}

/**
 * Reports every failed attempt the moment its test ends: the failed steps, each with the first
 * line of its error, then the full error go to standard error and, with `logFile` set, are
 * appended to that file as plain text.
 */
export default class ImmediateFailureReporter implements Reporter {
    private logFile = '';

    constructor(private readonly options: ImmediateFailureOptions = {}) {}

    onBegin(config: FullConfig): void {
        if (this.options.logFile) {
            const configFolder = config.configFile ? dirname(config.configFile) : config.rootDir;
            this.logFile = resolve(configFolder, this.options.logFile);
            mkdirSync(dirname(this.logFile), { recursive: true });
            writeFileSync(this.logFile, '');
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
            ...failedStepsOf(result).map((step) => formatFailedStep(step, result.retry + 1)),
            errors,
            '',
        ].join('\n');
        console.error(entry);
        if (this.logFile) {
            appendFileSync(this.logFile, stripAnsi(entry) + '\n');
        }
    }

    printsToStdio(): boolean {
        return false;
    }
}
