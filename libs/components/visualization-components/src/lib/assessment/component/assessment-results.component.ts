import {Component, Input} from '@angular/core';
import {Assessment} from '@crczp/visualization-model';
import {MatCardModule} from '@angular/material/card';
import {FFQResultsComponent} from './ffq-results/ffq-results.component';
import {MCQResultsComponent} from './mcq-results/mcq-results.component';
import {EMIResultsComponent} from './emi-results/emi-results.component';

/**
 * Component displaying result of one assessment. Contains components of assessment questions
 */
@Component({
    selector: 'crczp-assessment-results',
    templateUrl: './assessment-results.component.html',
    styleUrls: ['./assessment-results.component.css'],
    imports: [
        FFQResultsComponent,
        MCQResultsComponent,
        EMIResultsComponent,
        MatCardModule
    ]
})
export class AssessmentResultsComponent {
    @Input() assessments: Assessment[];
}
