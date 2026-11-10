import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Tokens } from 'marked';
import { AttachmentMediaComponent } from '../media/attachment-media.component';
import { isDetailsClosing, paragraphPartsOf } from '../model/markdown-blocks';
import { MarkdownInlineComponent } from './markdown-inline.component';

/**
 * Renders one block-level markdown token. A paragraph that references attachments renders its
 * text first and each referenced attachment as its own block directly below it.
 */
@Component({
    selector: 'crczp-markdown-block',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MarkdownInlineComponent, AttachmentMediaComponent],
    templateUrl: './markdown-block.component.html',
    styleUrl: './markdown-block.component.scss',
})
export class MarkdownBlockComponent {
    readonly token = input.required<Tokens.Generic>();

    /** Whether the block is a lone tag closing a collapsible section, which draws nothing of its own. */
    protected readonly closesSection = computed(() => isDetailsClosing(this.token().raw));

    protected readonly paragraph = computed(() => {
        const token = this.token();
        const flowsText = token.type === 'paragraph' || (token.type === 'text' && token.tokens);
        return flowsText ? paragraphPartsOf(token.tokens ?? []) : undefined;
    });
}
