import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AttachmentMetadata, AttachmentSource } from '../attachment/attachment-source';
import { AttachmentChipComponent } from './attachment-chip.component';

vi.mock('@crczp/components', async () => {
    const { Directive, input } = await import('@angular/core');

    @Directive({ selector: '[crczpRichTooltip]' })
    class RichTooltipDirective {
        readonly crczpRichTooltip = input<unknown>();
    }

    return { RichTooltipDirective };
});

describe('AttachmentChipComponent unavailable tooltip', () => {
    function statusOf(lookup: Observable<AttachmentMetadata | undefined>): string | undefined {
        TestBed.configureTestingModule({
            providers: [{ provide: AttachmentSource, useValue: { metadata: vi.fn(() => lookup), isPending: () => false } }],
        });
        const fixture = TestBed.createComponent(AttachmentChipComponent);
        fixture.componentRef.setInput('hash', 'hash');
        fixture.detectChanges();
        fixture.detectChanges();
        const { tooltip } = fixture.componentInstance as unknown as { tooltip: () => { rows: { label: string; value: string }[] } };
        return tooltip().rows.find((row) => row.label === 'Status')?.value;
    }

    it('keeps the missing-file text when no file has the hash', () => {
        expect(statusOf(of(undefined))).toBe('No stored file has this hash');
    });

    it('says the file cannot be opened on a 403', () => {
        expect(statusOf(throwError(() => new HttpErrorResponse({ status: 403 })))).toBe("You can't open this file (HTTP 403).");
    });

    it('says the file could not be loaded on a 500', () => {
        expect(statusOf(throwError(() => new HttpErrorResponse({ status: 500 })))).toBe('This file could not be loaded (HTTP 500).');
    });

    it('names a missing response', () => {
        expect(statusOf(throwError(() => new Error('offline')))).toBe('This file could not be loaded (no response).');
    });
});
