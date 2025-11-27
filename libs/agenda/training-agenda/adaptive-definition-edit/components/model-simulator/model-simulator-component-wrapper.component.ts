import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Phase } from '@crczp/training-model';
import {
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { ModelSimulatorComponent } from '@crczp/components';

@Component({
    selector: 'crczp-model-simulator',
    templateUrl: './model-simulator-component-wrapper.component.html',
    styleUrls: ['./model-simulator-component-wrapper.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        ModelSimulatorComponent,
    ],
})
export class ModelSimulatorComponentWrapper {
    @Input() phases: Phase[];
}
