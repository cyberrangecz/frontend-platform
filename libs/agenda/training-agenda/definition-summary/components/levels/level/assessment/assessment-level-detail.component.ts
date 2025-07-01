import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AssessmentLevel, AssessmentTypeEnum } from '@crczp/training-model';

@Component({
    selector: 'crczp-assessment-level-detail',
    templateUrl: './assessment-level-detail.component.html',
    styleUrls: ['./assessment-level-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssessmentLevelDetailComponent {
    @Input() level: AssessmentLevel;

    isTest(): boolean {
        return this.level.assessmentType === AssessmentTypeEnum.Test;
    }
}
