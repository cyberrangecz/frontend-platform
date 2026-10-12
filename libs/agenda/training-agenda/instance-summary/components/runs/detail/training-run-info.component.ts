import { Component, HostBinding, inject, Input, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { TrainingRun, TrainingRunInfo } from '@crczp/training-model';
import { TrainingRunSummaryService } from '../../../services/state/runs/training-run-summary.service';
import { SentinelTableComponent } from '@sentinel/components/table';
import { TrainingInfoTable } from '../../../model/training-info-table';
import { take } from 'rxjs/operators';
import { TableEmptyStateDirective, TableModel } from '@crczp/components';

@Component({
    selector: 'crczp-training-run-info',
    templateUrl: './training-run-info.component.html',
    styleUrls: ['./training-run-info.component.css'],
    providers: [TrainingRunSummaryService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SentinelTableComponent, TableEmptyStateDirective],
})
export class TrainingRunInfoComponent implements OnInit {
    @HostBinding('style.width') width = '100%';
    @Input() sentinelExpandData: TrainingRun;
    protected readonly info = signal<TableModel<TrainingRunInfo, string> | undefined>(undefined);
    protected readonly hasError = signal(false);
    private trainingRunService = inject(TrainingRunSummaryService);

    ngOnInit(): void {
        this.trainingRunService.getInfo(this.sentinelExpandData.id).subscribe(
            (res) => {
                this.info.set(new TrainingInfoTable(res));
                this.hasError.set(false);
            },
            () => this.hasError.set(true),
        );
    }

    /**
     * Gets new data for table
     * @param loadEvent event emitted by table component to get new data
     */
    onLoadEvent(): void {
        this.trainingRunService
            .getInfo(this.sentinelExpandData.id)
            .pipe(take(1))
            .subscribe();
    }
}
