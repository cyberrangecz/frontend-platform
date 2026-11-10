import { ApplicationRef, ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PortalConfig } from '@crczp/utils';
import { Observable, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AttachmentDownload } from './attachment-download';
import { AttachmentDownloadEvent, AttachmentSource } from './attachment-source';

const DEFAULT_LIMIT_BYTES = 52_428_800;

function parsePortalConfig(attachments?: object): PortalConfig {
    return PortalConfig.schema().parse({
        defaultPageSize: 10,
        roleMapping: {
            uagAdmin: 'a',
            trainingDesigner: 'b',
            trainingOrganizer: 'c',
            trainingTrainee: 'd',
            sandboxDesigner: 'e',
            sandboxOrganizer: 'f',
        },
        polling: { pollingPeriodShort: '5s', pollingPeriodLong: '30s', retryCount: 3 },
        caching: { eventCacheTtl: '7d', entityCacheTtl: '30m' },
        basePaths: { linearTraining: 'x', guacamole: 'x', mitre: 'x', userAndGroup: 'x', sandbox: 'x' },
        authConfig: {},
        ...(attachments ? { attachments } : {}),
    }) as PortalConfig;
}

function createDownload(config: PortalConfig): { download: AttachmentDownload; started: ReturnType<typeof vi.fn> } {
    const started = vi.fn();
    const source = {
        download: (): Observable<AttachmentDownloadEvent> => {
            started();
            return new Subject<AttachmentDownloadEvent>();
        },
        isDownloaded: () => false,
    } as unknown as AttachmentSource;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        providers: [
            { provide: AttachmentSource, useValue: source },
            { provide: PortalConfig, useValue: config },
            { provide: ElementRef, useValue: new ElementRef(document.createElement('div')) },
        ],
    });
    const download = TestBed.runInInjectionContext(() => new AttachmentDownload(() => 'hash'));
    return { download, started };
}

function settle(): void {
    TestBed.inject(ApplicationRef).tick();
}

describe('attachment auto-download limit', () => {
    it('defaults to 50 MiB when the key is missing', () => {
        expect(parsePortalConfig().attachments.autoDownloadLimitBytes).toBe(DEFAULT_LIMIT_BYTES);
    });

    it('reads the configured size', () => {
        expect(parsePortalConfig({ autoDownloadMaxSize: '2MB' }).attachments.autoDownloadLimitBytes).toBe(2_097_152);
    });

    it('downloads by itself below the default limit and waits at or above it', () => {
        const config = parsePortalConfig();
        const below = createDownload(config);
        below.download.startIfSmall(DEFAULT_LIMIT_BYTES - 1);
        settle();
        expect(below.started).toHaveBeenCalledTimes(1);
        expect(below.download.state()).toBe('loading');

        const atLimit = createDownload(config);
        atLimit.download.startIfSmall(DEFAULT_LIMIT_BYTES);
        settle();
        expect(atLimit.started).not.toHaveBeenCalled();
        expect(atLimit.download.state()).toBe('idle');
    });

    it('applies a configured limit', () => {
        const { download, started } = createDownload(parsePortalConfig({ autoDownloadMaxSize: '1KB' }));
        download.startIfSmall(1024);
        expect(started).not.toHaveBeenCalled();
        download.startIfSmall(1023);
        settle();
        expect(started).toHaveBeenCalledTimes(1);
    });
});
