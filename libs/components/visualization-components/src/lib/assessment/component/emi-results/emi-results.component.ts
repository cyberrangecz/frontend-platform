import {Component, Input, OnInit} from '@angular/core';

import {EMITableAdapter} from '../../table-adapter/emi-table-adapter';
import {HighlightService} from '../../services/highlight.service';
import {HighlightableDirective} from '../../directives/highlightable.directive';
import {AssessmentEmiAnswers, AssessmentParticipant, AssessmentQuestion} from '@crczp/visualization-model';
import {CommonModule} from '@angular/common';
import {EmiTableComponent} from './emi-table/emi-table.component';

/**
 * Component displaying result of a extended matching items
 */
@Component({
    selector: 'crczp-emi-results',
    templateUrl: './emi-results.component.html',
    styleUrls: ['./emi-results.component.css'],
    imports: [
        CommonModule,
        EmiTableComponent
    ]
})
export class EMIResultsComponent extends HighlightableDirective implements OnInit {
    @Input() question: AssessmentQuestion;
    @Input() isTest: boolean;
    tableAdapters: EMITableAdapter[] = [];

    constructor(highlightService: HighlightService) {
        super(highlightService);
    }

    ngOnInit(): void {
        this.tableAdapters = this.question.answers.map((answer) => new EMITableAdapter(answer as AssessmentEmiAnswers));
    }

    /**
     * Calls service to highlight the answer
     * @param $event mouse event
     */
    highlighted($event: { participant: AssessmentParticipant; mouseEvent: MouseEvent }): void {
        this.highlight($event.participant, $event.mouseEvent);
    }
}
