import { Component, input } from '@angular/core';
import { SentinelMarkdownViewComponent } from '@sentinel/components/markdown-view';

@Component({
    selector: 'crczp-hint-content',
    imports: [SentinelMarkdownViewComponent],
    templateUrl: './hint-content.component.html',
    styleUrl: './hint-content.component.scss',
})
export class HintContentComponent {
    hintTitle = input.required<string>();
    hintText = input.required<string>();
    color = input<CSSStyleDeclaration['backgroundColor']>(
        'var(--primary-60)',
    );
}
