import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * The glyph of a download button. While confirmed, the download arrow morphs into a check mark
 * that pulses once; when confirmed ends, the check morphs back into the arrow. Purely
 * decorative: the accessible name and the announcement stay with the caller. It takes its size
 * from the font size of its container.
 */
@Component({
    selector: 'crczp-download-icon',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule],
    templateUrl: './download-icon.component.html',
    styleUrl: './download-icon.component.scss',
    host: {
        'aria-hidden': 'true',
        '[class.download-icon--confirmed]': 'confirmed()',
    },
})
export class DownloadIconComponent {
    readonly confirmed = input(false);
}
