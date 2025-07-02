import { Component, Input, OnInit, inject } from '@angular/core';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import {MCQTableAdapter} from '../../table-adapter/mcq-table-adapter';
import {HighlightService} from '../../services/highlight.service';
import {HighlightableDirective} from '../../directives/highlightable.directive';
import {AssessmentQuestion} from '@crczp/visualization-model';
import {CommonModule} from '@angular/common';
import {MatTooltipModule} from '@angular/material/tooltip';

/**
 * Component displaying result of a multiple choice question
 */
@Component({
    selector: 'crczp-mcq-results',
    templateUrl: './mcq-results.component.html',
    styleUrls: ['./../emi-mcq-table-shared.component.css'],
    imports: [
        CommonModule,
        MatTooltipModule,
        MatTableModule
    ]
})
export class MCQResultsComponent extends HighlightableDirective implements OnInit {
    @Input() question: AssessmentQuestion;
    @Input() isTest: boolean;

    /**
     * Columns of the table
     */
    displayedColumns = ['option', 'sum', 'percentage', 'answers'];
    dataSource;

    constructor() {
        const highlightService = inject(HighlightService);

        super(highlightService);
    }

    ngOnInit(): void {
        this.dataSource = new MatTableDataSource(new MCQTableAdapter(this.question).rows);
    }
}
