import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {InfoPhase} from '@crczp/training-model';
import {SentinelMarkdownEditorComponent} from "@sentinel/components/markdown-editor";
import {MatFormField, MatInput, MatLabel} from "@angular/material/input";

/**
 * Component for view of existing Info Phase
 */
@Component({
    selector: 'crczp-info-phase-configuration',
    templateUrl: './info-phase-edit.component.html',
    styleUrls: ['./info-phase-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelMarkdownEditorComponent,
        MatFormField,
        MatInput,
        MatLabel
    ]
})
export class InfoPhaseEditComponent {
    @Input() phase: InfoPhase;
}
