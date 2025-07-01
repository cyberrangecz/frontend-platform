import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TrainingRun } from '@crczp/training-model';
import { SentinelTable, TableActionEvent, TableLoadEvent } from '@sentinel/components/table';

@Component({
    selector: 'crczp-training-instance-runs',
    templateUrl: './training-instance-runs.component.html',
    styleUrls: ['./training-instance-runs.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingInstanceRunsComponent {
    @Input() trainingRuns: SentinelTable<TrainingRun>;
    @Input() hasError: boolean;

    @Output() tableAction: EventEmitter<TableActionEvent<TrainingRun>> = new EventEmitter();
    @Output() TableLoadEvent: EventEmitter<TableLoadEvent> = new EventEmitter();
    @Output() rowExpanded: EventEmitter<number> = new EventEmitter();

    /**
     * Emits table action event
     * @param event action event emitted from table
     */
    onTableAction(event: TableActionEvent<TrainingRun>): void {
        this.tableAction.emit(event);
    }

    onTableRowExpand(event: TableActionEvent<TrainingRun>): void {
        this.rowExpanded.emit(event.element.id);
    }

    /**
     * Emits load table vent
     * @param event reload data event emitted from table
     */
    onTableLoadEvent(event: TableLoadEvent): void {
        this.TableLoadEvent.emit(event);
    }
}
