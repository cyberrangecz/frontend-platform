import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {TrainingLevel} from '@crczp/training-model';
import { MarkdownViewComponent } from '@crczp/markdown';
import {MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle} from "@angular/material/expansion";
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
    selector: 'crczp-training-level-detail',
    templateUrl: './training-level-detail.component.html',
    styleUrls: ['./training-level-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MarkdownViewComponent,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        MatIcon,
        MatTooltip
    ]
})
export class TrainingLevelDetailComponent {
    @Input() level: TrainingLevel;

    getMitreTechniques(): string {
        return this.level.mitreTechniques.map((technique) => technique.techniqueKey).toString();
    }
}
