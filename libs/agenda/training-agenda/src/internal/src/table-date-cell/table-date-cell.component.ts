import {
    AfterViewInit,
    Component,
    ElementRef,
    HostListener,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    signal,
    ViewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableDateCellSyncService } from './table-date-cell-sync.service';

@Component({
    selector: 'crczp-table-date-cell',
    standalone: true,
    imports: [DatePipe],
    templateUrl: './table-date-cell.component.html',
    styleUrl: './table-date-cell.component.css',
})
export class TableDateCellComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
    @Input() dateDisplayFormat: string = 'd MMM, yyyy';
    @Input() timeDisplayFormat: string = 'HH:mm';
    @Input() showTimeWhenPossible: boolean = false;
    @Input() shrinkThreshold: number = 140;
    @Input({ required: true }) displayedDate: Date;
    @Input() isLoading: boolean = false;

    hover = signal(false);
    initialized = signal(false);
    colWidth = signal(0);
    isWideEnough = signal(false);

    @ViewChild('boundaryDiv') boundaryDiv: ElementRef<HTMLDivElement>;

    private widthUpdate: (state: number) => void;

    constructor(private sync: TableDateCellSyncService) {}

    ngOnInit(): void {
        this.widthUpdate = this.sync.register(this.colWidth);
    }

    ngOnChanges(): void {
        this.onResize();
    }

    ngOnDestroy(): void {
        this.sync.unregister(this.colWidth);
    }

    ngAfterViewInit(): void {
        this.onResize();
    }

    @HostListener('window:resize', ['$event'])
    onResize(): void {
        if (this.isLoading) {
            this.isWideEnough.set(false);
            return;
        }
        if (this.widthUpdate) {
            this.widthUpdate(this.boundaryDiv.nativeElement.getBoundingClientRect().width);
        }
        const isWideEnough = this.colWidth() > this.shrinkThreshold;
        if (isWideEnough !== this.isWideEnough()) {
            this.initialized.set(false);
        }
        this.isWideEnough.set(isWideEnough);
    }
}
