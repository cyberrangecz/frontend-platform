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
    TemplateRef,
    ViewChild,
} from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { thresholdBuffer } from '../../../../../logic/tresholdBufferPipe';
import { sum } from 'd3';
import { DividerPositionSynchronizerService } from '../../../../../services/training-run/level/synchronization/divider-position/divider-position-synchronizer.service';

class DefaultDividerPositionSynchronizerService extends DividerPositionSynchronizerService {
    private splitViewDimensionsSubject: BehaviorSubject<number>;

    constructor(initialPosition: number = 0.5) {
        super();
        this.splitViewDimensionsSubject = new BehaviorSubject(initialPosition);
    }

    emitDividerChange(percentPosition: number): void {
        this.splitViewDimensionsSubject.next(percentPosition);
    }

    getDividerPosition$(): Observable<number> {
        return this.splitViewDimensionsSubject.asObservable();
    }

    getDividerPosition(): number {
        return this.splitViewDimensionsSubject.value;
    }
}

@Component({
    selector: 'crczp-split-container',
    templateUrl: './split-container.component.html',
    styleUrl: './split-container.component.css',
})
export class SplitContainerComponent implements AfterViewInit {
    @Input() leftPanelContent: TemplateRef<any>;
    @Input() rightPanelContent: TemplateRef<any>;

    @Input() leftPanelMinWidth: string = '10%';
    @Input() rightPanelMinWidth: string = '10%';

    /**
     * Number of pixels the mouse has to move before the divider position is updated
     */
    @Input() dividerUpdateThreshold = 20;

    @Input() disableAtWindowWidth: number;
    @Input() defaultRatio = 0.5;

    /**
     * Service that synchronizes the divider position between multiple instances of the split container
     * If no service is provided, the divider position changes stay local to the component
     */
    @Input() dividerPositionSynchronizer: DividerPositionSynchronizerService =
        new DefaultDividerPositionSynchronizerService();

    @Output() leftPanelWidth = new EventEmitter<number>();
    @Output() rightPanelWidth = new EventEmitter<number>();

    @ViewChild('left') leftPanel: ElementRef<HTMLDivElement>;
    @ViewChild('right') rightPanel: ElementRef<HTMLDivElement>;

    private dragBehaviourSubject: BehaviorSubject<number> = new BehaviorSubject(0);

    private readonly destroyRef = inject(DestroyRef);

    ngAfterViewInit(): void {
        this.setPanelRatio(this.dividerPositionSynchronizer.getDividerPosition() || this.defaultRatio);
        this.setupDividerPositionListener();
        this.setupDragListener();
    }

    @HostListener('window:resize', ['$event'])
    onResize(event: any): void {
        if (event.target.innerWidth < this.disableAtWindowWidth) {
            this.unsetPanelWidths();
        } else {
            this.setPanelRatio(this.dividerPositionSynchronizer.getDividerPosition() || this.defaultRatio);
        }
        this.leftPanelWidth.emit(this.leftPanel.nativeElement.offsetWidth);
        this.rightPanelWidth.emit(this.rightPanel.nativeElement.offsetWidth);
    }

    private calculateRatio(sliderDelta: number): number {
        return (
            (this.leftPanel.nativeElement.offsetWidth + sliderDelta) /
            (this.rightPanel.nativeElement.offsetWidth + this.leftPanel.nativeElement.offsetWidth)
        );
    }

    private setPanelRatio(ratio: number): void {
        this.leftPanel.nativeElement.style.width = `${ratio * 100}%`;
        this.rightPanel.nativeElement.style.width = `${100 - ratio * 100}%`;
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
                this.leftPanelWidth.emit(this.leftPanel.nativeElement.offsetWidth);
                this.rightPanelWidth.emit(this.rightPanel.nativeElement.offsetWidth);
            });
    }

    private setupDragListener(): void {
        this.dragBehaviourSubject
            .pipe(
                thresholdBuffer((values) => Math.abs(sum(values)) > this.dividerUpdateThreshold),
                map((bufferedValues) => sum(bufferedValues)),
            )
            .subscribe((movement) => {
                this.dividerPositionSynchronizer.emitDividerChange(this.calculateRatio(movement));
            });
    }

    mouseDown(event: MouseEvent): void {
        const mouseUp = () => {
            document.removeEventListener('mousemove', mouseMove);
            document.removeEventListener('mouseup', mouseUp);
        };

        const mouseMove = (event: MouseEvent) => {
            this.dragBehaviourSubject.next(event.movementX);
        };

        document.addEventListener('mouseup', mouseUp);
        document.addEventListener('mousemove', mouseMove);
        event.preventDefault();
        event.stopPropagation();
    }
}
