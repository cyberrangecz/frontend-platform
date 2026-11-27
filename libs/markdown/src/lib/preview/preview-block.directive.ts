import { Directive, inject, input } from '@angular/core';
import { AttachmentMetadata } from '../attachment/attachment-source';
import { FocusStep, MediaItemActions } from '../media/media-item-actions';
import { MarkdownBlock, MediaReference } from '../model/markdown-blocks';
import { LivePreviewComponent } from './live-preview.component';

/** A rendered block of the live preview, through which the media cards inside it act on the block. */
@Directive({
    selector: '[crczpPreviewBlock]',
    providers: [{ provide: MediaItemActions, useExisting: PreviewBlockDirective }],
})
export class PreviewBlockDirective extends MediaItemActions {
    private readonly preview = inject(LivePreviewComponent);

    readonly block = input.required<MarkdownBlock>({ alias: 'crczpPreviewBlock' });

    override remove(reference: MediaReference): void {
        this.preview.remove(this.block(), reference);
    }

    override relink(reference: MediaReference, material: AttachmentMetadata, label: string): void {
        this.preview.relink(this.block(), reference, material, label);
    }

    override relabel(reference: MediaReference, label: string): void {
        this.preview.relabel(this.block(), reference, label);
    }

    override resize(reference: MediaReference, maxWidth: number | undefined): void {
        this.preview.resize(this.block(), reference, maxWidth);
    }

    override step(card: HTMLElement, direction: FocusStep): void {
        this.preview.step(this.block(), card, direction);
    }
}
