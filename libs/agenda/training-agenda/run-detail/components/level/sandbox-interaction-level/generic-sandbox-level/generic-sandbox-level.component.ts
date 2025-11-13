import {
    AfterViewInit,
    Component,
    DestroyRef,
    ElementRef,
    EventEmitter,
    HostListener,
    inject,
    Input,
    Output,
    signal,
    TemplateRef,
    ViewChild,
} from '@angular/core';
import { AnswerFormHintsComponent } from '../subcomponents/answer-floating-form/answer-form-hints/answer-form-hints.component';
import { Observable, of } from 'rxjs';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { FloatingAnswerFormComponent } from '../subcomponents/answer-floating-form/floating-answer-form.component';
import { TopologyWrapperComponent } from '../subcomponents/topology-wrapper/topology-wrapper.component';
import { TopologySplitViewSynchronizerService } from '@crczp/topology-graph';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { thresholdBuffer } from '@crczp/utils';
import { sum } from 'd3';
import { map } from 'rxjs/operators';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'crczp-generic-sandbox-level',
    templateUrl: './generic-sandbox-level.component.html',
    styleUrl: './generic-sandbox-level.component.css',
    imports: [
        AsyncPipe,
        NgTemplateOutlet,
        MatButton,
        FloatingAnswerFormComponent,
        TopologyWrapperComponent,
        MatIcon,
    ],
})
export class GenericSandboxLevelComponent implements AfterViewInit {
    @Input({ required: true }) levelContent: string;
    @Input() isLast: boolean;
    @Input() isBacktracked: boolean;
    @Input() isStepperDisplayed: boolean;
    @Input() isLoading: Observable<boolean> = of(false);
    @Input() isCorrectAnswerSubmitted$: Observable<boolean> = of(false);
    @Input() isSolutionRevealed$: Observable<boolean> = of(false);
    @Input() sandboxInstanceId: string;
    @Input() sandboxDefinitionId: number;
    @Input() displayedSolutionContent$: Observable<string> = of();
    @Input() displayedHintsContent$: Observable<string> = of();
    @Input() hints!: TemplateRef<AnswerFormHintsComponent>;
    @Output() getAccessFile: EventEmitter<void> = new EventEmitter();
    @Output() next: EventEmitter<void> = new EventEmitter();
    @Output() answerSubmitted: EventEmitter<string> = new EventEmitter();

    @ViewChild('left') leftPanel!: ElementRef<HTMLDivElement>;
    @ViewChild('right') rightPanel!: ElementRef<HTMLDivElement>;
    @ViewChild('levelContentElement')
    levelContentElement!: ElementRef<HTMLDivElement>;
    DIVIDER_UPDATE_THRESHOLD = 20;
    DISABLE_AT_WINDOW_WIDTH = 1400;
    DEFAULT_RATIO = 0.5;
    LEFT_PANEL_MIN_WIDTH = 0.1;
    RIGHT_PANEL_MIN_WIDTH = 0.1;
    isCollapsed = signal(false);
    protected dividerPositionSynchronizer = inject(
        TopologySplitViewSynchronizerService
    );
    protected readonly window = window;
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        toObservable(this.isCollapsed).subscribe((collapsed) => {
            this.updateTopologyWidth();
            //   this.dividerPositionSynchronizer.emitCollapsed(collapsed);
        });
    }

    ngAfterViewInit(): void {
        this.setupDividerPositionListener();
        this.setupDragListener();
        this.setupCollapseListener();
        this.onResize();
    }

    @HostListener('window:resize')
    onResize(): void {
        if (
            this.DISABLE_AT_WINDOW_WIDTH &&
            window.innerWidth < this.DISABLE_AT_WINDOW_WIDTH
        ) {
            this.unsetPanelWidths();
            this.updateTopologyWidth();
        } else {
            this.setPanelRatio(
                this.dividerPositionSynchronizer.getDividerPosition() ||
                    this.DEFAULT_RATIO
            );
        }
    }

    private calculateRatio(sliderDelta: number): number {
        const leftWidth = this.leftPanel.nativeElement.offsetWidth;
        const rightWidth = this.rightPanel.nativeElement.offsetWidth;
        const totalWidth = leftWidth + rightWidth;

        const newLeftWidth = leftWidth + sliderDelta;

        const ratio = newLeftWidth / totalWidth;

        const minRatio = this.LEFT_PANEL_MIN_WIDTH;
        const maxRatio = 1 - this.RIGHT_PANEL_MIN_WIDTH;

        const boundedRatio = Math.max(minRatio, Math.min(ratio, maxRatio));

        return boundedRatio;
    }

    private setPanelRatio(ratio: number): void {
        if (this.isCollapsed() || !this.leftPanel || !this.rightPanel) return;

        // Ensure ratio is within bounds
        const newRatioBounded = Math.max(
            this.LEFT_PANEL_MIN_WIDTH,
            Math.min(ratio, 1 - this.RIGHT_PANEL_MIN_WIDTH)
        );

        this.leftPanel.nativeElement.style.width = `${newRatioBounded * 100}%`;
        this.rightPanel.nativeElement.style.width = `${
            (1 - newRatioBounded) * 100
        }%`;

        this.leftPanel.nativeElement.style.boxSizing = 'border-box';
        this.rightPanel.nativeElement.style.boxSizing = 'border-box';

        this.updateTopologyWidth();
    }

    private unsetPanelWidths(): void {
        this.leftPanel.nativeElement.removeAttribute('style');
        this.rightPanel.nativeElement.removeAttribute('style');
    }

    private setupDividerPositionListener(): void {
        this.dividerPositionSynchronizer
            .getDividerPosition$()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((ratio: number) => {
                this.setPanelRatio(ratio);
            });
    }

    private setupDragListener(): void {
        this.dividerPositionSynchronizer.drag$
            .pipe(
                thresholdBuffer(
                    (values) =>
                        Math.abs(sum(values)) > this.DIVIDER_UPDATE_THRESHOLD
                ),
                map((bufferedValues) => sum(bufferedValues)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((movement) => {
                console.log('Movement', movement);
                const newRatio = this.calculateRatio(movement);
                this.dividerPositionSynchronizer.emitDividerRatioChange(
                    newRatio
                );
            });
    }

    private setupCollapseListener(): void {
        this.dividerPositionSynchronizer.topologyCollapsed$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((collapse) => {
                this.isCollapsed.set(collapse);
                if (!collapse) {
                    const currentRatio =
                        this.dividerPositionSynchronizer.getDividerPosition();
                    if (currentRatio !== undefined) {
                        this.setPanelRatio(currentRatio);
                    }
                } else {
                    // When collapsed, ensure the left panel takes full width
                    this.unsetPanelWidths();
                }
            });
    }

    private updateTopologyWidth() {
        requestAnimationFrame(() => {
            if (this.rightPanel) {
                this.dividerPositionSynchronizer.emitTopologyWidthChange(
                    this.rightPanel.nativeElement.offsetWidth -
                        (window.innerWidth > 1400 ? 24 : 0)
                );
            }
        });
    }
}
