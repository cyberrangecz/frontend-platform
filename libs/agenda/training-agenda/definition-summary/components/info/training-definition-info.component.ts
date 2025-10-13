import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {TrainingDefinition} from '@crczp/training-model';
import {MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle} from "@angular/material/expansion";
import {MatIcon} from "@angular/material/icon";

@Component({
    selector: 'crczp-training-definition-info',
    templateUrl: './training-definition-info.component.html',
    styleUrls: ['./training-definition-info.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatIcon,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle
    ]
})
export class TrainingDefinitionInfoComponent {
    @Input() trainingDefinition: TrainingDefinition;
}
