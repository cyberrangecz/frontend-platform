import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Phase } from '@crczp/training-model';

@Component({
    selector: 'crczp-model-simulator',
    templateUrl: './model-simulator.component.html',
    styleUrls: ['./model-simulator.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelSimulatorComponent {
    @Input() phases: Phase[];
}
