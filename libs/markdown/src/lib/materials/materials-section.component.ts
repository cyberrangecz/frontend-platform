import { CdkTrapFocus } from '@angular/cdk/a11y';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { formatBytes } from '../attachment/attachment-kind';
import { MaterialIntake } from '../attachment/material-intake';
import { TrainingMaterials } from '../attachment/training-materials';
import { FileDropTargetDirective } from '../editor/file-drop-target.directive';
import { BudgetMeterComponent } from './budget-meter.component';
import { MaterialsPanelComponent } from './materials-panel.component';

/** The panel hangs flush from the field's bottom edge. */
const PANEL_POSITIONS: ConnectedPosition[] = [{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' }];

/**
 * The strip segment of the training materials, as high as the strip: the label, the file count
 * and the budget they use. Opening it rolls the materials panel down flush from the segment, at
 * its width, with no backdrop; the panel rolls up when a drag starts or the author clicks away.
 * Files dropped on the segment from outside the browser are stored without being placed in the content.
 */
@Component({
    selector: 'crczp-materials-section',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OverlayModule, CdkTrapFocus, MatIconModule, BudgetMeterComponent, MaterialsPanelComponent],
    hostDirectives: [FileDropTargetDirective],
    templateUrl: './materials-section.component.html',
    styleUrl: './materials-section.component.scss',
    host: { '[class.section--file-over]': 'fileDrop.active()' },
})
export class MaterialsSectionComponent {
    protected readonly store = inject(TrainingMaterials);
    private readonly injector = inject(Injector);
    private readonly destroyRef = inject(DestroyRef);
    private readonly intake = new MaterialIntake();

    protected readonly fileDrop = inject(FileDropTargetDirective);

    private readonly field = viewChild.required<ElementRef<HTMLButtonElement>>('field');
    private readonly focusTrap = viewChild(CdkTrapFocus);

    protected readonly positions = PANEL_POSITIONS;
    protected readonly open = signal(false);
    protected readonly panelWidth = signal(0);

    protected readonly countText = computed(() => {
        const count = this.store.materials().length;
        return count === 1 ? '1 file' : `${count} files`;
    });
    protected readonly accessibleName = computed(
        () => `Training materials, ${this.countText()}, ${formatBytes(this.store.usedBytes())} of ${formatBytes(this.store.budgetBytes())} used`,
    );

    constructor() {
        this.fileDrop.filesDropped.subscribe(({ files }) => this.intake.take(files, true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe());
    }

    /** Rolls the panel up without moving focus. */
    collapse(): void {
        this.open.set(false);
    }

    protected toggle(): void {
        if (this.open()) {
            this.collapse();
            return;
        }
        this.panelWidth.set(this.field().nativeElement.getBoundingClientRect().width);
        this.open.set(true);
    }

    /** Rolls the panel up once the drag has begun, since removing its source within dragstart cancels the drag. */
    protected onMaterialDragStarted(): void {
        setTimeout(() => this.collapse());
    }

    protected onPanelAttached(): void {
        afterNextRender(() => this.focusTrap()?.focusTrap.focusInitialElementWhenReady(), { injector: this.injector });
    }

    protected onPanelKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape') {
            return;
        }
        event.preventDefault();
        this.collapse();
        this.field().nativeElement.focus();
    }

    protected onOutsideClick(event: MouseEvent): void {
        if (!this.field().nativeElement.contains(event.target as Node)) {
            this.collapse();
        }
    }
}
