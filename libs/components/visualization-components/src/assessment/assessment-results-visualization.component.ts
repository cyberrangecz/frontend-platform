import {Component, inject, Input, OnChanges} from '@angular/core';
import {Observable} from 'rxjs';
import {Assessment} from '@crczp/visualization-model';
import {AssessmentApi,} from '@crczp/visualization-api';
import {AsyncPipe, CommonModule} from '@angular/common';
import {AssessmentResultsComponent} from './component/assessment-results.component';
import {MatButtonModule} from '@angular/material/button';
import {MatTableModule} from '@angular/material/table';
import {MatCardModule} from '@angular/material/card';
import {MatDividerModule} from '@angular/material/divider';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {HighlightService} from './services/highlight.service';

/**
 * Main component of the assessment visualization
 */
@Component({
    selector: 'crczp-assessment-results-visualization',
    template: `
        <crczp-assessment-results
            [assessments]="assessments$ | async"
        />`,
    imports: [
        AsyncPipe,
        AssessmentResultsComponent,
        CommonModule,
        MatButtonModule,
        MatTableModule,
        MatCardModule,
        MatDividerModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule,
    ],
    providers: [
        HighlightService,
        AssessmentApi,
    ],
})
export class AssessmentResultsVisualizationComponent implements OnChanges {
    /**
     * Id of a training instance to be visualized
     */
    @Input() trainingInstanceId: number;
    assessments$: Observable<Assessment[]>;
    private assessmentFacade = inject(AssessmentApi);

    ngOnChanges(): void {
        if (this.trainingInstanceId) {
            this.assessments$ = this.assessmentFacade.getAssessments(
                this.trainingInstanceId
            );
        }
    }
}
