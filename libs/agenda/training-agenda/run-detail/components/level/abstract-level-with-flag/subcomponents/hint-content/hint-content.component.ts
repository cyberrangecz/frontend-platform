import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { MarkdownViewComponent } from '@crczp/markdown';

@Component({
    selector: 'crczp-hint-content',
    imports: [MarkdownViewComponent],
    templateUrl: './hint-content.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './hint-content.component.scss',
})
export class HintContentComponent {
    hintTitle = input.required<string>();
    hintText = input.required<string>();
    color = input<CSSStyleDeclaration['backgroundColor']>(
        'var(--primary-60)',
    );
}
