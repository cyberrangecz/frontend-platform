import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Tokens } from 'marked';
import { attachmentHashOf } from '../attachment/attachment-reference-grammar';
import { inlineSegmentsOf } from './inline-html';

/**
 * Renders inline markdown tokens through Angular bindings. Author HTML is written through the
 * innerHTML binding, so Angular's HTML sanitizer cleans it. Attachment references draw nothing;
 * the block renderer shows each as its own card.
 */
@Component({
    selector: 'crczp-markdown-inline',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './markdown-inline.component.html',
    styleUrl: './markdown-inline.component.scss',
})
export class MarkdownInlineComponent {
    readonly tokens = input.required<readonly Tokens.Generic[]>();

    protected readonly segments = computed(() => inlineSegmentsOf(this.tokens()));

    protected isAttachment(token: Tokens.Generic): boolean {
        return attachmentHashOf(token['href']) !== undefined;
    }
}
