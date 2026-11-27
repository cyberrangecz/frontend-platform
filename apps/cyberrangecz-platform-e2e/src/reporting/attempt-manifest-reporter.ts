import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import type { FullConfig, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

export interface AttemptManifestOptions {
    /** JSON Lines file receiving one record per finished attempt, relative to the config. */
    manifestFile: string;
}

/**
 * Appends one JSON line per finished test attempt to the manifest file the moment the attempt
 * ends: its full title, status, retry index and the directories holding its attachments, relative
 * to the manifest's folder. A run still in progress therefore has a manifest of its finished
 * attempts.
 */
export default class AttemptManifestReporter implements Reporter {
    private manifestFile = '';

    constructor(private readonly options: AttemptManifestOptions) {}

    onBegin(config: FullConfig): void {
        const configFolder = config.configFile ? dirname(config.configFile) : config.rootDir;
        this.manifestFile = resolve(configFolder, this.options.manifestFile);
        mkdirSync(dirname(this.manifestFile), { recursive: true });
        writeFileSync(this.manifestFile, '');
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        const manifestFolder = dirname(this.manifestFile);
        const directories = new Set(
            result.attachments.flatMap((attachment) =>
                attachment.path ? [relative(manifestFolder, dirname(attachment.path))] : [],
            ),
        );
        const record = {
            title: test.titlePath().slice(1).join(' > '),
            status: result.status,
            retry: result.retry,
            directories: [...directories],
        };
        appendFileSync(this.manifestFile, JSON.stringify(record) + '\n');
    }

    printsToStdio(): boolean {
        return false;
    }
}
