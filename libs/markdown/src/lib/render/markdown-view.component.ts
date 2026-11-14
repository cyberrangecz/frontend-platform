import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { groupSections, markdownBlocksOf } from '../model/markdown-blocks';
import { MarkdownBlockComponent } from './markdown-block.component';

/** Renders markdown as read-only content, attachments read through the provided attachment source. */
@Component({
    selector: 'crczp-markdown-view',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MarkdownBlockComponent],
    templateUrl: './markdown-view.component.html',
    styleUrl: './markdown-view.component.scss',
})
export class MarkdownViewComponent {
    readonly markdown = input.required<string>();

    protected readonly items = computed(() => groupSections(markdownBlocksOf(this.markdown())));
}
