import { Component, HostBinding, inject, Input, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { TrainingRun, TrainingRunInfo } from '@crczp/training-model';
import { TrainingRunSummaryService } from '../../../services/state/runs/training-run-summary.service';
import { SentinelTableComponent, TableColumnVisibilityService } from '@sentinel/components/table';
import { TrainingInfoTable } from '../../../model/training-info-table';
import { take } from 'rxjs/operators';
import { TableEmptyStateDirective, TableModel } from '@crczp/components';
import { NgxSkeletonLoaderComponent, NgxSkeletonLoaderConfigTheme } from 'ngx-skeleton-loader';

@Component({
    selector: 'crczp-training-run-info',
    templateUrl: './training-run-info.component.html',
    styleUrls: ['./training-run-info.component.css'],
    providers: [TrainingRunSummaryService, TableColumnVisibilityService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SentinelTableComponent, TableEmptyStateDirective, NgxSkeletonLoaderComponent],
})
export class TrainingRunInfoComponent implements OnInit {
    @HostBinding('style.width') width = '100%';
    @Input() sentinelExpandData: TrainingRun;
    protected readonly info = signal<TableModel<TrainingRunInfo, string> | undefined>(undefined);
    protected readonly hasError = signal(false);
    protected readonly isLoading = signal(true);
    protected readonly skeletonTheme: NgxSkeletonLoaderConfigTheme = {
        height: 'var(--space-5xl)',
        margin: '0',
        'border-radius': 'var(--space-md)',
        'background-color': 'var(--neutral-95)',
    };
    private trainingRunService = inject(TrainingRunSummaryService);

    ngOnInit(): void {
        this.loadInfo();
    }

    /** Reloads the table data on a table load request, such as the error state's try again. */
    onLoadEvent(): void {
        this.loadInfo();
    }

    private loadInfo(): void {
        this.trainingRunService
            .getInfo(this.sentinelExpandData.id)
            .pipe(take(1))
            .subscribe({
                next: (res) => {
                    this.info.set(new TrainingInfoTable(res));
                    this.hasError.set(false);
                    this.isLoading.set(false);
                },
                error: () => {
                    this.hasError.set(true);
                    this.isLoading.set(false);
                },
            });
    }
}
