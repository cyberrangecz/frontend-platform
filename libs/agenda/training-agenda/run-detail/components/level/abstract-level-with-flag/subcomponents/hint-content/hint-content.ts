import { Component, input } from '@angular/core';
import { SentinelMarkdownViewComponent } from '@sentinel/components/markdown-view';

@Component({
    selector: 'crczp-hint-content',
    imports: [SentinelMarkdownViewComponent],
    templateUrl: './hint-content.html',
    styleUrl: './hint-content.scss',
})
export class HintContent {
    hintId = input.required<number>();
    hintText = input.required<string>();
}
