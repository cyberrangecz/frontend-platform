import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortalConfig } from '@crczp/utils';
import { EMPTY, NEVER } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentMetadata, AttachmentSource } from '../attachment/attachment-source';
import { ImageMediaComponent } from './image-media.component';

const METADATA: AttachmentMetadata = { hash: 'hash', fileName: 'photo.png', mediaType: 'image/png', size: 10, width: 1600, height: 900 };

class FakeResizeObserver {
    static readonly instances: FakeResizeObserver[] = [];

    constructor(readonly callback: () => void) {
        FakeResizeObserver.instances.push(this);
    }

    observe(): void {}

    disconnect(): void {}
}

describe('ImageMediaComponent size limits', () => {
    let fixture: ComponentFixture<ImageMediaComponent>;

    beforeEach(() => {
        FakeResizeObserver.instances.length = 0;
        vi.stubGlobal('ResizeObserver', FakeResizeObserver);
        vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(134);
        vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(40);
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: AttachmentSource,
                    useValue: { download: () => NEVER, poster: () => EMPTY, isPending: () => false, isDownloaded: () => false },
                },
                { provide: PortalConfig, useValue: { attachments: { autoDownloadLimitBytes: 0 } } },
            ],
        });
        fixture = TestBed.createComponent(ImageMediaComponent);
        fixture.componentRef.setInput('metadata', METADATA);
        fixture.detectChanges();
        fixture.detectChanges();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('has limits once the download button has been measured', () => {
        expect(FakeResizeObserver.instances).not.toHaveLength(0);
        FakeResizeObserver.instances.forEach((observer) => observer.callback());

        expect(fixture.componentInstance.sizeLimits()).toEqual({ minimum: 166, maximum: 3200 });
    });
});
