import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {MatSlideToggle} from "@angular/material/slide-toggle";
import {MatFormField, MatInput, MatLabel} from "@angular/material/input";
import {SentinelMarkdownEditorComponent} from "@sentinel/components/markdown-editor";
import {AdaptiveTask} from "@crczp/training-model";

@Component({
    selector: 'crczp-task-configuration',
    templateUrl: './task-edit.component.html',
    styleUrls: ['./task-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatSlideToggle,
        MatFormField,
        SentinelMarkdownEditorComponent,
        MatLabel,
        MatInput
    ]
})
export class TaskEditComponent {
    @Input() task: AdaptiveTask;
}
