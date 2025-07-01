import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AbstractLevelTypeEnum, Level } from '@crczp/training-model';

@Component({
    selector: 'crczp-level-detail',
    templateUrl: './abstract-level-detail.component.html',
    styleUrls: ['./abstract-level-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbstractLevelDetailComponent {
    @Input() level: Level;

    levelTypes = AbstractLevelTypeEnum;
}
