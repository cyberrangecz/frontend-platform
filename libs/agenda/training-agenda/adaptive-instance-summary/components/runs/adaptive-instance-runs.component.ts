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
    selector: 'crczp-adaptive-instance-runs',
    templateUrl: './adaptive-instance-runs.component.html',
    styleUrls: ['./adaptive-instance-runs.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SentinelTableComponent],
})
export class AdaptiveInstanceRunsComponent {
    @Input() trainingRuns: SentinelTable<TrainingRun, string>;
    @Input() hasError: boolean;

    @Output() TableLoadEvent: EventEmitter<TableLoadEvent<string>> =
        new EventEmitter();

    /**
     * Emits load table vent
     * @param event reload data event emitted from table
     */
    onTableLoadEvent(event: TableLoadEvent<string>): void {
        this.TableLoadEvent.emit(event);
    }
}
