import { booleanAttribute, ChangeDetectionStrategy, Component, inject, input, model, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TrainingMaterials } from '../attachment/training-materials';
import { MaterialsSectionComponent } from '../materials/materials-section.component';
import { LivePreviewComponent } from '../preview/live-preview.component';
import { MarkdownViewComponent } from '../render/markdown-view.component';
import { EditingViewPreference } from './editing-view.service';
import { FormatTargetService } from './format-target.service';
import { FormatToolbarComponent } from './format-toolbar.component';
import { RawEditorComponent } from './raw-editor.component';

/**
 * One framed editing surface over markdown, switched between the rendered preview and the raw
 * source. The frame's 48 px top strip holds the mode tabs, the formatting controls centred on the
 * text column, and, where training materials are provided, the materials section, and, when expandable, the expand button at its end. When the
 * strip cannot hold them all, the tabs, the section and the button move to a row above the controls.
 */
@Component({
    selector: 'crczp-markdown-editor-frame',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        MatButtonToggleModule,
        MatIconModule,
        MatTooltipModule,
        FormatToolbarComponent,
        LivePreviewComponent,
        MarkdownViewComponent,
        MaterialsSectionComponent,
        RawEditorComponent,
    ],
    providers: [FormatTargetService],
    templateUrl: './markdown-editor-frame.component.html',
    styleUrl: './markdown-editor-frame.component.scss',
})
export class MarkdownEditorFrameComponent {
    readonly markdown = model.required<string>();
    readonly readonly = input(false);
    /** Shows the expand button in the strip. */
    readonly expandable = input(false, { transform: booleanAttribute });
    readonly expand = output<void>();

    protected readonly hasMaterials = inject(TrainingMaterials, { optional: true }) !== null;
    protected readonly editingView = inject(EditingViewPreference);
}
