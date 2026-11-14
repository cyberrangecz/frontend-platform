import { CdkListbox, CdkOption } from '@angular/cdk/listbox';
import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    linkedSignal,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OverflowTooltipDirective } from '@crczp/utils';
import { typeLabelOf } from '../attachment/attachment-kind';
import { AttachmentMetadata } from '../attachment/attachment-source';
import { ByteSizePipe } from '../attachment/byte-size.pipe';
import { MaterialIntake } from '../attachment/material-intake';
import { TrainingMaterials } from '../attachment/training-materials';
import { AttachmentThumbnailComponent } from './attachment-thumbnail.component';
import { distinctSuffixesOf, hasSuffix } from './file-suffix';
import { SuffixFilterComponent } from './suffix-filter.component';

/** A stored file picked to stand behind a reference, with the label the reference is to carry. */
export interface MaterialChoice {
    readonly material: AttachmentMetadata;
    readonly label: string;
}

/**
 * Chooses the file a reference points at: a file browsed from the device, stored in the training
 * materials first, or one of the stored materials from a filterable list. The reference's label
 * is edited alongside and travels with the pick, or with closing the picker.
 */
@Component({
    selector: 'crczp-material-picker',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CdkListbox, CdkOption, MatButtonModule, MatIconModule, OverflowTooltipDirective, ByteSizePipe, AttachmentThumbnailComponent, SuffixFilterComponent],
    templateUrl: './material-picker.component.html',
    styleUrl: './material-picker.component.scss',
    host: { '(keydown.escape)': 'onEscape($event)' },
})
export class MaterialPickerComponent {
    private readonly store = inject(TrainingMaterials);
    private readonly intake = new MaterialIntake();
    private readonly destroyRef = inject(DestroyRef);
    private readonly filterField = viewChild<ElementRef<HTMLInputElement>>('filterField');
    private readonly browseButton = viewChild.required<string, ElementRef<HTMLButtonElement>>('browseButton', { read: ElementRef });
    private readonly options = viewChild(CdkListbox);

    /** Label of the reference as it stands. */
    readonly label = input.required<string>();
    readonly picked = output<MaterialChoice>();
    /** Emits the label as left in the field when the picker closes without a pick. */
    readonly closed = output<string>();

    protected readonly draftLabel = linkedSignal(() => this.label());
    protected readonly filter = signal('');
    protected readonly adding = this.intake.working;
    protected readonly suffixes = computed(() => distinctSuffixesOf(this.store.materials().map((material) => material.fileName)));
    /** The suffix the list is narrowed to; null shows every suffix, and falls back to it when the chosen suffix leaves the store. */
    protected readonly suffix = linkedSignal<string[], string | null>({
        source: this.suffixes,
        computation: (suffixes, previous) => (previous?.value != null && suffixes.includes(previous.value) ? previous.value : null),
    });
    protected readonly candidates = computed(() => {
        const filter = this.filter().trim().toLowerCase();
        const suffix = this.suffix();
        return this.store
            .materials()
            .filter((material) => material.fileName.toLowerCase().includes(filter) && (suffix === null || hasSuffix(material.fileName, suffix)));
    });
    protected readonly hasMaterials = computed(() => this.store.materials().length > 0);

    constructor() {
        afterNextRender(() => (this.filterField() ?? this.browseButton()).nativeElement.focus());
    }

    close(): void {
        this.closed.emit(this.draftLabel().trim());
    }

    protected onEscape(event: Event): void {
        event.stopPropagation();
        this.close();
    }

    protected focusOptions(event: Event): void {
        const options = this.options();
        if (options) {
            event.preventDefault();
            options.focus();
        }
    }

    protected pick(value: unknown): void {
        const material = this.candidates().find((candidate) => candidate === value);
        if (material) {
            this.choose(material);
        }
    }

    /** Stores the file browsed from the device and picks it. */
    protected onFilePicked(fileInput: HTMLInputElement): void {
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (!file) {
            return;
        }
        this.intake
            .take([file])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(([material]) => material && this.choose(material));
    }

    protected typeOf(material: AttachmentMetadata): string {
        return typeLabelOf(material);
    }

    private choose(material: AttachmentMetadata): void {
        this.picked.emit({ material, label: this.draftLabel().trim() });
    }
}
