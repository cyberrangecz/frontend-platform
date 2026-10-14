import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { TrainingRun } from '@crczp/training-model';
import { SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { TrainingRunSort } from '@crczp/training-api';
import { TableEmptyStateDirective, TableModel } from '@crczp/components';
import { SortDir } from '@crczp/utils';

@Component({
    selector: 'crczp-training-instance-runs',
    templateUrl: './training-instance-runs.component.html',
    styleUrls: ['./training-instance-runs.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SentinelTableComponent, TableEmptyStateDirective],
})
export class TrainingInstanceRunsComponent {
    @Input() trainingRuns: TableModel<TrainingRun, TrainingRunSort>;
    @Input() hasError: boolean;
    @Input() isLoading: boolean;
    @Input() defaultSortName: TrainingRunSort;
    @Input() defaultSortDirection: SortDir;

    @Output() TableLoadEvent: EventEmitter<TableLoadEvent<TrainingRunSort>> =
        new EventEmitter();
    @Output() rowExpanded: EventEmitter<number> = new EventEmitter();

    onTableRowExpand(event: TrainingRun): void {
        this.rowExpanded.emit(event.id);
    }

    /**
     * Emits load table vent
     * @param event reload data event emitted from table
     */
    onTableLoadEvent(event: TableLoadEvent<TrainingRunSort>): void {
        this.TableLoadEvent.emit(event);
    }
}
