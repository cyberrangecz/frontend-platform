import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AccessLevel} from '@crczp/training-model';
import { MarkdownViewComponent } from '@crczp/markdown';

@Component({
    selector: 'crczp-access-level',
    templateUrl: './access-level.component.html',
    styleUrls: ['./access-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MarkdownViewComponent
    ]
})
export class AccessLevelComponent {
    @Input() level: AccessLevel;
}
