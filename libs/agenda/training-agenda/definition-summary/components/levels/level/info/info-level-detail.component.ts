import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {InfoLevel} from '@crczp/training-model';
import {MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle} from "@angular/material/expansion";
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";

@Component({
    selector: 'crczp-info-level-detail',
    templateUrl: './info-level-detail.component.html',
    styleUrls: ['../level-summary-common.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatIcon,
        MatExpansionPanelTitle,
        MatExpansionPanelHeader,
        MatExpansionPanel,
        MatTooltip,
        SentinelMarkdownViewComponent
    ]
})
export class InfoLevelDetailComponent {
    @Input() level: InfoLevel;
}
