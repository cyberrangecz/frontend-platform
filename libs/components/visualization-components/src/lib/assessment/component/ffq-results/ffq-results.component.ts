import { Component, Input, OnInit, inject } from '@angular/core';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import {HighlightService} from '../../services/highlight.service';
import {HighlightableDirective} from '../../directives/highlightable.directive';
import {AssessmentQuestion} from '@crczp/visualization-model';
import {FFQTableAdapter} from '../../table-adapter/ffq-table-adapter';
import {CommonModule} from '@angular/common';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatInputModule} from '@angular/material/input';

/**
 * Component displaying result of a free form question
 */
@Component({
    selector: 'crczp-ffq-results',
    templateUrl: './ffq-results.component.html',
    styleUrls: ['./ffq-results.component.css'],
    imports: [
        CommonModule,
        MatTooltipModule,
        MatTableModule,
        MatInputModule
    ]
})
export class FFQResultsComponent extends HighlightableDirective implements OnInit {
    @Input() question: AssessmentQuestion;
    @Input() isTest: boolean;

    /**
     * Columns of the table
     */
    displayedColumns = ['name', 'answer'];
    dataSource;

    constructor() {
        const highlightService = inject(HighlightService);

        super(highlightService);
    }

    ngOnInit(): void {
        this.dataSource = new MatTableDataSource(new FFQTableAdapter(this.question).rows);
    }

    /**
     * Filters by answer
     * @param filterValue answer to filter by
     */
    applyFilter(filterValue: string): void {
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }
}
