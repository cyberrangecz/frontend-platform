import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AttachmentFailure } from '../attachment/attachment-facts';
import { MediaReference } from '../model/markdown-blocks';
import { MaterialPickerComponent } from './material-picker.component';
import { MediaItemActions } from './media-item-actions';
import { ReferencePickerSession } from './reference-picker-session';

const SHORT_HASH_LENGTH = 8;
const FORBIDDEN = 403;

/**
 * Stands where a referenced attachment would be when it cannot be shown: no stored file has its
 * hash, or the lookup failed. A forbidden lookup says the file cannot be opened; any other failure
 * says the file could not be loaded with the HTTP status, and offers a retry that emits `retry`.
 * Where the content is editable, the card removes the reference, or expands the file picker in place, from
 * which a pick points the reference at that file.
 */
@Component({
    selector: 'crczp-missing-media',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MaterialPickerComponent],
    templateUrl: './missing-media.component.html',
    styleUrl: './missing-media.component.scss',
    host: { role: 'group', 'aria-label': 'Unavailable file' },
})
export class MissingMediaComponent {
    private readonly chooseButton = viewChild<string, ElementRef<HTMLButtonElement>>('chooseButton', { read: ElementRef });
    private readonly picker = viewChild(MaterialPickerComponent);

    protected readonly actions = inject(MediaItemActions, { optional: true });

    readonly reference = input.required<MediaReference>();
    /** Why the lookup failed; absent when the file is missing. */
    readonly failure = input<AttachmentFailure>();
    readonly retry = output<void>();

    protected readonly pickerSession = new ReferencePickerSession({
        reference: this.reference,
        picker: this.picker,
        fallbackFocus: () => this.chooseButton()?.nativeElement ?? null,
    });
    protected readonly shortHash = computed(() => this.reference().hash.slice(0, SHORT_HASH_LENGTH));

    protected readonly forbidden = computed(() => this.failure()?.status === FORBIDDEN);
    protected readonly retryable = computed(() => this.failure() !== undefined && !this.forbidden());

    openPicker(): void {
        this.pickerSession.open();
    }
}
