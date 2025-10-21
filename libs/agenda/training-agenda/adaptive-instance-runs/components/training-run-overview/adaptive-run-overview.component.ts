import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TrainingRun } from '@crczp/training-model';
import {
    SentinelRowDirective,
    SentinelTable,
    SentinelTableComponent,
    TableLoadEvent
} from '@sentinel/components/table';

import { MatRipple } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

/**
 * Component displaying training runs and its state in real time.
 */
@Component({
    selector: 'crczp-adaptive-run-overview',
    templateUrl: './adaptive-run-overview.component.html',
    styleUrls: ['./adaptive-run-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelTableComponent,
        SentinelRowDirective,
        MatRipple,
        MatIcon,
        MatTooltip,
    ],
})
export class AdaptiveRunOverviewComponent {
    @Input() adaptiveRuns: SentinelTable<TrainingRun, string>;
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
