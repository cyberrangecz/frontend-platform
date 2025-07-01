import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { SentinelFreeFormComponent } from '@sentinel/components/free-form';
import { SentinelMarkdownEditorModule } from '@sentinel/components/markdown-editor';
import { SentinelStepperModule } from '@sentinel/components/stepper';
import { AbstractLevelEditComponent } from './abstract-level-edit.component';
import { AssessmentLevelEditComponent } from './assessment/assessment-level-edit.component';
import { QuestionEditComponent } from './assessment/question/detail/question-edit.component';
import { ExtendedMatchingItemsEditComponent } from './assessment/question/extended-matching-items/extended-matching-items-edit.component';
import { FreeFormQuestionEditComponent } from './assessment/question/free-form-question/free-form-question-edit.component';
import { MultipleChoiceQuestionEditComponent } from './assessment/question/multiple-choice-question/multiple-choice-question-edit.component';
import { QuestionsOverviewComponent } from './assessment/question/overview/questions-overview.component';
import { TrainingLevelEditComponent } from './training/training-level-edit.component';
import { HintDetailEditComponent } from './training/hint/detail/hint-detail-edit.component';
import { HintsOverviewComponent } from './training/hint/overview/hints-overview.component';
import { InfoLevelEditComponent } from './info/info-level-edit.component';
import { LevelEditMaterialModule } from './level-edit-material.module';
import { AccessLevelEditComponent } from './access/access-level-edit.component';
import { MitreTechniqueSelectComponent } from './training/mitre-technique/mitre-technique-select.component';
import { ExpectedCommandsSelectComponent } from './training/expected-commands/expected-commands-select.component';
import { MarkedOptions, SentinelMarkdownViewModule } from '@sentinel/components/markdown-view';

const markdownConfig = {
    markdownParser: {
        markedOptions: {
            provide: MarkedOptions,
            useValue: {
                gfm: true,
                tables: true,
                breaks: false,
                pedantic: false,
                smartLists: true,
                smartypants: false,
            },
        },
    },
    markdownEditor: {
        fileUploadRestUrl: '',
    },
};

/**
 * Module containing components and providers related to level edit/detail
 */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SentinelFreeFormComponent,
        SentinelMarkdownEditorModule.forRoot(markdownConfig),
        SentinelStepperModule,
        LevelEditMaterialModule,
        MatSlideToggleModule,
        ReactiveFormsModule,
        SentinelControlsComponent,
        SentinelMarkdownViewModule,
    ],
    exports: [AbstractLevelEditComponent],
    declarations: [
        AccessLevelEditComponent,
        TrainingLevelEditComponent,
        InfoLevelEditComponent,
        AssessmentLevelEditComponent,
        AbstractLevelEditComponent,
        HintsOverviewComponent,
        HintDetailEditComponent,
        QuestionsOverviewComponent,
        QuestionEditComponent,
        FreeFormQuestionEditComponent,
        MultipleChoiceQuestionEditComponent,
        ExtendedMatchingItemsEditComponent,
        MitreTechniqueSelectComponent,
        ExpectedCommandsSelectComponent,
    ],
    providers: [],
})
export class LevelEditComponentsModule {}
