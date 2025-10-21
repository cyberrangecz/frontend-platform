import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { SentinelRowDirective, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { MatRipple } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { TrainingRunTable } from '../../model/training-run-table';
import { TrainingRunSort } from '@crczp/training-api';

/**
 * Component displaying training runs and its state in real time.
 */
@Component({
    selector: 'crczp-training-run-overview',
    templateUrl: './training-run-overview.component.html',
    styleUrls: ['./training-run-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelTableComponent,
        MatRipple,
        MatIcon,
        SentinelRowDirective,
        MatTooltip,
    ],
})
export class TrainingRunOverviewComponent {
    @Input() trainingRuns: TrainingRunTable;
    @Input() hasError: boolean;
    @Input() isLoading: boolean;

    @Output() TableLoadEvent: EventEmitter<TableLoadEvent<TrainingRunSort>> =
        new EventEmitter();

    /**
     * Emits load table vent
     * @param event reload data event emitted from table
     */
    onTableLoadEvent(event: TableLoadEvent<TrainingRunSort>): void {
        this.TableLoadEvent.emit(event);
    }
}
