import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatTable,
    MatTableDataSource
} from '@angular/material/table';
import {EMITableAdapter} from '../../../table-adapter/emi-table-adapter';
import {AssessmentParticipant} from '@crczp/visualization-model';
import {DecimalPipe, NgClass} from "@angular/common";
import {MatTooltip} from "@angular/material/tooltip";

/**
 * Component displaying table of extended matching items result
 */
@Component({
    selector: 'crczp-emi-results-table',
    templateUrl: './emi-table.component.html',
    styleUrls: ['../../emi-mcq-table-shared.component.css'],
    imports: [
        MatTable,
        NgClass,
        MatHeaderCell,
        MatCell,
        MatColumnDef,
        MatHeaderCellDef,
        DecimalPipe,
        MatTooltip,
        MatRow,
        MatHeaderRow,
        MatRowDef,
        MatHeaderRowDef,
        MatCellDef
    ]
})
export class EmiTableComponent implements OnInit {
    @Input() tableData: EMITableAdapter;
    @Input() isTest: boolean;
    @Output() highlighted: EventEmitter<{
        participant: AssessmentParticipant;
        mouseEvent: MouseEvent
    }> = new EventEmitter();

    displayedColumns = ['option', 'sum', 'percentage', 'answers'];
    dataSource;

    ngOnInit(): void {
        this.dataSource = new MatTableDataSource(this.tableData.rows);
    }

    /**
     * Calls service to highlight the answer
     * @param participant
     * @param $event mouse event
     */
    onHighlight(participant: AssessmentParticipant, $event: MouseEvent): void {
        this.highlighted.emit({participant: participant, mouseEvent: $event});
    }
}
