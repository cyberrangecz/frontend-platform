import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentMetadata, AttachmentSource } from '../attachment/attachment-source';
import { ATTACHMENT_CARDS } from './attachment-cards';
import { AttachmentMediaComponent } from './attachment-media.component';

const METADATA: AttachmentMetadata = { hash: 'hash', fileName: 'clip.mp4', mediaType: 'video/mp4', size: 10 };
const MISSING_DETAIL = 'This file could not be loaded. Let your instructor know.';

@Component({ selector: 'crczp-stub-card', template: '' })
class StubCardComponent {}

describe('AttachmentMediaComponent unavailable card', () => {
    let metadata: ReturnType<typeof vi.fn<() => Observable<AttachmentMetadata | undefined>>>;
    let fixture: ComponentFixture<AttachmentMediaComponent>;

    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} });
        metadata = vi.fn<() => Observable<AttachmentMetadata | undefined>>();
        TestBed.configureTestingModule({
            providers: [
                { provide: ATTACHMENT_CARDS, useValue: { video: { component: StubCardComponent } } },
                { provide: AttachmentSource, useValue: { metadata, isPending: () => false } },
            ],
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    function render(): void {
        fixture = TestBed.createComponent(AttachmentMediaComponent);
        fixture.componentRef.setInput('reference', { hash: 'hash', label: '' });
        fixture.detectChanges();
        fixture.detectChanges();
    }

    const detail = (): string => (fixture.nativeElement.querySelector('.missing-detail') as HTMLElement).textContent!.trim();
    const retryButton = (): HTMLButtonElement | undefined =>
        Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
            (button) => button.textContent?.includes('Retry'),
        );

    it('keeps the missing-file wording and offers no retry when no file has the hash', () => {
        metadata.mockReturnValue(of(undefined));

        render();

        expect(detail()).toBe(MISSING_DETAIL);
        expect(retryButton()).toBeUndefined();
    });

    it('says the file cannot be opened on a 403 and offers no retry', () => {
        metadata.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

        render();

        expect(detail()).toBe("You can't open this file (HTTP 403).");
        expect(retryButton()).toBeUndefined();
    });

    it('says the file could not be loaded on a 500 and retries the lookup', () => {
        metadata.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
        render();

        expect(detail()).toBe('This file could not be loaded (HTTP 500).');

        metadata.mockReturnValueOnce(of(METADATA));
        retryButton()!.click();
        fixture.detectChanges();
        fixture.detectChanges();

        expect(metadata).toHaveBeenCalledTimes(2);
        expect(fixture.nativeElement.querySelector('crczp-missing-media')).toBeNull();
    });

    it('names a missing response when the request got no HTTP status', () => {
        metadata.mockReturnValue(throwError(() => new Error('offline')));

        render();

        expect(detail()).toBe('This file could not be loaded (no response).');
        expect(retryButton()).toBeDefined();
    });
});
