import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AssessmentLevel } from '@crczp/training-model';

@Component({
    selector: 'crczp-assessment-level',
    templateUrl: './assessment-level.component.html',
    styleUrls: ['./assessment-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssessmentLevelComponent {
    @Input() level: AssessmentLevel;
}
