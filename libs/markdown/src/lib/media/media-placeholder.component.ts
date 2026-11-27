import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Empty card shown while an attachment's metadata loads; its host exposes no content. */
@Component({
    selector: 'crczp-media-placeholder',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '',
    styleUrl: './media-placeholder.component.scss',
    host: { 'aria-busy': 'true' },
})
export class MediaPlaceholderComponent {}
