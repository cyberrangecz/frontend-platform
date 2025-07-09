import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {TrainingPhase} from '@crczp/training-model';
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";
import {MatTab, MatTabGroup} from "@angular/material/tabs";

@Component({
    selector: 'crczp-training-phase',
    templateUrl: './training-phase.component.html',
    styleUrls: ['./training-phase.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelMarkdownViewComponent,
        MatTabGroup,
        MatTab
    ]
})
export class TrainingPhaseComponent implements OnChanges {
    @Input() phase: TrainingPhase;

    selectedTab: number;

    ngOnChanges(changes: SimpleChanges): void {
        if ('phase' in changes) {
            this.selectedTab = 0;
        }
    }
}
