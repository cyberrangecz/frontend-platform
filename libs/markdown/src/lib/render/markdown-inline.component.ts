import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tokens } from 'marked';
import { attachmentHashOf } from '../attachment/attachment-reference-grammar';

const SAFE_URL_PATTERN = /^(?:https?:|mailto:)/i;

/**
 * Renders inline markdown tokens through Angular bindings, so no author HTML reaches the DOM.
 * Attachment references draw nothing; the block renderer shows each as its own card.
 */
@Component({
    selector: 'crczp-markdown-inline',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './markdown-inline.component.html',
    styleUrl: './markdown-inline.component.scss',
})
export class MarkdownInlineComponent {
    readonly tokens = input.required<readonly Tokens.Generic[]>();

    protected isAttachment(token: Tokens.Generic): boolean {
        return attachmentHashOf(token['href']) !== undefined;
    }

    protected isSafeUrl(href: string | undefined): boolean {
        return !!href && SAFE_URL_PATTERN.test(href);
    }
}
