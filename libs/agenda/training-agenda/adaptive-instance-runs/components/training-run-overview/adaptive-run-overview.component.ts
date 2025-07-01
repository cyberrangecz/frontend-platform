import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {TrainingRun} from '@crczp/training-model';
import {
    SentinelRowDirective,
    SentinelTable,
    SentinelTableComponent,
    TableActionEvent,
    TableLoadEvent
} from '@sentinel/components/table';
import {NgIf} from "@angular/common";
import {MatRipple} from "@angular/material/core";
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";

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
        NgIf,
        MatRipple,
        MatIcon,
        MatTooltip
    ]
})
export class AdaptiveRunOverviewComponent {
    @Input() adaptiveRuns: SentinelTable<TrainingRun>;
    @Input() hasError: boolean;

    @Output() tableAction: EventEmitter<TableActionEvent<TrainingRun>> = new EventEmitter();
    @Output() TableLoadEvent: EventEmitter<TableLoadEvent> = new EventEmitter();

    /**
     * Emits table action event
     * @param event action event emitted from table
     */
    onTableAction(event: TableActionEvent<TrainingRun>): void {
        this.tableAction.emit(event);
    }

    /**
     * Emits load table vent
     * @param event reload data event emitted from table
     */
    onTableLoadEvent(event: TableLoadEvent): void {
        this.TableLoadEvent.emit(event);
    }
}
