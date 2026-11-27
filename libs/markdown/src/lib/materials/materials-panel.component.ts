import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, linkedSignal, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SentinelConfirmationDialogComponent, SentinelConfirmationDialogConfig, SentinelDialogResultEnum } from '@sentinel/components/dialogs';
import { OverflowTooltipDirective } from '@crczp/utils';
import { filter } from 'rxjs';
import { typeLabelOf } from '../attachment/attachment-kind';
import { AttachmentMetadata } from '../attachment/attachment-source';
import { ByteSizePipe } from '../attachment/byte-size.pipe';
import { MaterialIntake } from '../attachment/material-intake';
import { MaterialTransfer, TrainingMaterials } from '../attachment/training-materials';
import { AttachmentDragService } from '../editor/attachment-drag.service';
import { AttachmentThumbnailComponent } from '../media/attachment-thumbnail.component';
import { distinctSuffixesOf, hasSuffix } from '../media/file-suffix';
import { SuffixFilterComponent } from '../media/suffix-filter.component';

/**
 * Every material of the training definition in a filterable list, with a file picker that adds
 * files. A row shows the progress of its upload, or why it failed with a Retry button. Each row can be dragged out into the content and removed; removing a material the
 * content references first asks for confirmation.
 */
@Component({
    selector: 'crczp-materials-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatProgressBarModule, OverflowTooltipDirective, ByteSizePipe, AttachmentThumbnailComponent, SuffixFilterComponent],
    templateUrl: './materials-panel.component.html',
    styleUrl: './materials-panel.component.scss',
})
export class MaterialsPanelComponent {
    protected readonly store = inject(TrainingMaterials);
    private readonly dialog = inject(MatDialog);
    private readonly destroyRef = inject(DestroyRef);
    private readonly drags = inject(AttachmentDragService);
    private readonly intake = new MaterialIntake();

    /** Emits when a material starts being dragged out of the list. */
    readonly materialDragStarted = output<AttachmentMetadata>();

    protected readonly adding = this.intake.working;
    protected readonly filter = signal('');
    protected readonly hasMaterials = computed(() => this.store.materials().length > 0);
    protected readonly suffixes = computed(() => distinctSuffixesOf(this.store.materials().map(({ fileName }) => fileName)));
    /** The suffix the list is narrowed to; null shows every suffix, and falls back to it when the chosen suffix leaves the store. */
    protected readonly suffix = linkedSignal<string[], string | null>({
        source: this.suffixes,
        computation: (suffixes, previous) => (previous?.value != null && suffixes.includes(previous.value) ? previous.value : null),
    });
    protected readonly candidates = computed(() => {
        const text = this.filter().trim().toLowerCase();
        const suffix = this.suffix();
        return this.store.materials().filter(({ fileName }) => fileName.toLowerCase().includes(text) && (suffix === null || hasSuffix(fileName, suffix)));
    });

    protected onRowDragStart(event: DragEvent, material: AttachmentMetadata): void {
        this.drags.start(event, { kind: 'material', material });
        this.materialDragStarted.emit(material);
    }

    protected onFilesPicked(input: HTMLInputElement): void {
        const files = Array.from(input.files ?? []);
        input.value = '';
        if (files.length > 0) {
            this.intake.take(files, true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
        }
    }

    /** Removes the material at once when no content references it, else after the author confirms. */
    protected remove(material: AttachmentMetadata): void {
        const places = this.store.referenceCount(material.hash);
        if (places === 0) {
            this.store.remove(material.hash);
            return;
        }
        this.dialog
            .open(SentinelConfirmationDialogComponent, {
                data: new SentinelConfirmationDialogConfig(
                    'Remove material',
                    `${material.fileName} is used in ${places === 1 ? '1 place' : `${places} places`}. Removing it also removes ${places === 1 ? 'that reference' : 'those references'} from the content of every level.`,
                    'Keep material',
                    'Remove material',
                ),
            })
            .afterClosed()
            .pipe(filter((result) => result === SentinelDialogResultEnum.CONFIRMED))
            .subscribe(() => this.store.remove(material.hash));
    }

    protected transferOf(material: AttachmentMetadata): MaterialTransfer | undefined {
        return this.store.transfers().get(material.hash);
    }

    protected typeOf(material: AttachmentMetadata): string {
        return typeLabelOf(material);
    }
}
