import {animate, state, style, transition, trigger} from '@angular/animations';
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AccessLevel} from '@crczp/training-model';
import {MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle} from "@angular/material/expansion";
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
    selector: 'crczp-access-level-detail',
    templateUrl: './access-level-detail.component.html',
    styleUrls: ['../level-summary-common.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('bodyExpansion', [
            state('false, void', style({height: '0px', visibility: 'hidden'})),
            state('true', style({height: '*', visibility: 'visible'})),
            transition('true <=> false, void => false', animate('225ms ease')),
        ]),
    ],
    imports: [
        MatIcon,
        MatExpansionPanelTitle,
        MatExpansionPanelHeader,
        MatExpansionPanel,
        MatTooltip
    ]
})
export class AccessLevelDetailComponent {
    @Input() level: AccessLevel;
    @Input() expanded = false;

    toggle(): void {
        this.expanded = !this.expanded;
    }
}
