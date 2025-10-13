import { Component, HostBinding, inject, Input, OnInit } from '@angular/core';
import { TrainingRun, TrainingRunInfo } from '@crczp/training-model';
import { TrainingRunConcreteService } from '../../../services/state/runs/training-run-concrete.service';
import { TrainingRunService } from '../../../services/state/runs/training-run.service';
import {
    SentinelTable,
    SentinelTableComponent,
} from '@sentinel/components/table';
import { TrainingInfoTable } from '../../../model/training-info-table';
import { take } from 'rxjs/operators';

@Component({
    selector: 'crczp-training-run-info',
    templateUrl: './training-run-info.component.html',
    styleUrls: ['./training-run-info.component.css'],
    providers: [
        { provide: TrainingRunService, useClass: TrainingRunConcreteService },
    ],
    imports: [SentinelTableComponent],
})
export class TrainingRunInfoComponent implements OnInit {
    @HostBinding('style.width') width = '100%';
    @Input() data: TrainingRun;
    info: SentinelTable<TrainingRunInfo>;
    hasError = false;
    private trainingRunService = inject(TrainingRunService);

    ngOnInit(): void {
        this.trainingRunService.getInfo(this.data.id).subscribe(
            (res) => {
                this.info = new TrainingInfoTable(res);
                this.hasError = false;
            },
            () => (this.hasError = true)
        );
    }

    /**
     * Gets new data for table
     * @param loadEvent event emitted by table component to get new data
     */
    onLoadEvent(): void {
        this.trainingRunService.getInfo(this.data.id).pipe(take(1)).subscribe();
    }
}
