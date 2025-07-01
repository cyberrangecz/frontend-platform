import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TrainingDefinition } from '@crczp/training-model';

@Component({
    selector: 'crczp-adaptive-definition-info',
    templateUrl: './adaptive-definition-info.component.html',
    styleUrls: ['./adaptive-definition-info.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdaptiveDefinitionInfoComponent {
    @Input() trainingDefinition: TrainingDefinition;
}
