import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AccessLevel } from '@crczp/training-model';

@Component({
    selector: 'crczp-access-level',
    templateUrl: './access-level.component.html',
    styleUrls: ['./access-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessLevelComponent {
    @Input() level: AccessLevel;
}
