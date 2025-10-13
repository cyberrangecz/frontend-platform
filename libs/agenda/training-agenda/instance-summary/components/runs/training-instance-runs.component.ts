import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { TrainingRun } from '@crczp/training-model';
import {
    SentinelTable,
    SentinelTableComponent,
    TableLoadEvent,
} from '@sentinel/components/table';

@Component({
    selector: 'crczp-training-instance-runs',
    templateUrl: './training-instance-runs.component.html',
    styleUrls: ['./training-instance-runs.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SentinelTableComponent],
})
export class TrainingInstanceRunsComponent {
    @Input() trainingRuns: SentinelTable<TrainingRun, string>;
    @Input() hasError: boolean;

    @Output() TableLoadEvent: EventEmitter<TableLoadEvent<string>> =
        new EventEmitter();
    @Output() rowExpanded: EventEmitter<number> = new EventEmitter();

    onTableRowExpand(event: TrainingRun): void {
        this.rowExpanded.emit(event.id);
    }

    /**
     * Emits load table vent
     * @param event reload data event emitted from table
     */
    onTableLoadEvent(event: TableLoadEvent<string>): void {
        this.TableLoadEvent.emit(event);
    }
}
