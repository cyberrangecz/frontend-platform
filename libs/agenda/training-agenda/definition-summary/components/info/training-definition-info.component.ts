import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TrainingDefinition } from '@crczp/training-model';

@Component({
    selector: 'crczp-training-definition-info',
    templateUrl: './training-definition-info.component.html',
    styleUrls: ['./training-definition-info.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingDefinitionInfoComponent {
    @Input() trainingDefinition: TrainingDefinition;
}
