import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';

const DOWNLOAD_START_MILLISECONDS = 30_000;

/** A file the browser downloaded after an action. */
export interface CapturedDownload {
    /** File name the browser offered. */
    fileName: string;
    /** File content decoded as UTF-8. */
    content: string;
    /** File size in bytes. */
    size: number;
}

/**
 * Runs an action that starts a download and reads the file the browser offers.
 * Fails with a timeout naming the download event when the browser offers no file in time.
 */
export async function captureDownload(
    page: Page,
    trigger: () => Promise<unknown>,
): Promise<CapturedDownload> {
    const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: DOWNLOAD_START_MILLISECONDS }),
        trigger(),
    ]);
    const path = await download.path();
    const buffer = await readFile(path);
    return {
        fileName: download.suggestedFilename(),
        content: buffer.toString('utf-8'),
        size: buffer.length,
    };
}

/**
 * Parses CSV text into rows of cells. Handles quoted cells with embedded separators, quotes
 * written as `""` and line breaks; a leading byte order mark is dropped.
 */
export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    const source = text.replace(/^﻿/, '');
    for (let index = 0; index < source.length; index++) {
        const character = source[index];
        if (quoted) {
            if (character === '"' && source[index + 1] === '"') {
                cell += '"';
                index++;
            } else if (character === '"') {
                quoted = false;
            } else {
                cell += character;
            }
        } else if (character === '"') {
            quoted = true;
        } else if (character === ',') {
            row.push(cell);
            cell = '';
        } else if (character === '\n' || character === '\r') {
            if (character === '\r' && source[index + 1] === '\n') {
                index++;
            }
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else {
            cell += character;
        }
    }
    if (cell !== '' || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }
    return rows;
}

/** Parses CSV text with a header row into one record per data row, keyed by header. */
export function parseCsvRecords(text: string): Record<string, string>[] {
    const [header = [], ...rows] = parseCsv(text);
    return rows.map((cells) => Object.fromEntries(header.map((name, index) => [name, cells[index] ?? ''])));
}
