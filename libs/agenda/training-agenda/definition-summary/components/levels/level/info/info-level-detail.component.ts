import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {InfoLevel} from '@crczp/training-model';

@Component({
    selector: 'crczp-info-level-detail',
    templateUrl: './info-level-detail.component.html',
    styleUrls: ['../level-summary-common.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoLevelDetailComponent {
    @Input() level: InfoLevel;
}
