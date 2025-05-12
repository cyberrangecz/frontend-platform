import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopologyGraphModule } from '@crczp/topology-graph';
import { AbstractLevelComponent } from './abstract-level.component';
import { AssessmentLevelComponent } from './assessment-level/assessment-level.component';
import { ExtendedMatchingItemsTraineeComponent } from './assessment-level/question/extended-matching-items/extended-matching-items-trainee.component';
import { FreeFormQuestionTraineeComponent } from './assessment-level/question/free-form-question/free-form-question-trainee.component';
import { MultipleChoiceQuestionTraineeComponent } from './assessment-level/question/multiple-choice-question/multiple-choice-question-trainee.component';
import { TraineeQuestionComponent } from './assessment-level/question/trainee-question.component';
import { TrainingLevelComponent } from './sandbox-interaction-level/training-level/training-level.component';
import { InfoLevelComponent } from './info-level/info-level.component';
import { LevelMaterialModule } from './level-material.module';
import { AccessLevelComponent } from './sandbox-interaction-level/access-level/access-level.component';
import { MarkedOptions, SentinelMarkdownViewModule } from '@sentinel/components/markdown-view';
import { MatToolbarModule } from '@angular/material/toolbar';
import { FloatingAnswerFormComponent } from './sandbox-interaction-level/subcomponents/answer-floating-form/floating-answer-form.component';
import { AnswerFormHintsComponent } from './sandbox-interaction-level/subcomponents/answer-floating-form/answer-form-hints/answer-form-hints.component';
import { TopologyWrapperComponent } from './sandbox-interaction-level/subcomponents/topology-wrapper/topology-wrapper.component';
import { GenericSandboxLevelComponent } from './sandbox-interaction-level/generic-sandbox-level/generic-sandbox-level.component';
import { SplitContainerComponent } from './sandbox-interaction-level/subcomponents/split-container/split-container.component';
import { TrainingTimerComponent } from './training-timer/training-timer.component';
import { DividerPositionSynchronizerService } from '../../services/training-run/level/synchronization/divider-position/divider-position-synchronizer.service';
import { PersistentDividerPositionSynchronizerService } from '../../services/training-run/level/synchronization/divider-position/persistent-divider-position-synchronizer.service';

const markdownParserConfig = {
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
};

/**
 * Module containing training run level component declarations and necessary imports for the components
 */
@NgModule({
    imports: [
        CommonModule,
        SentinelMarkdownViewModule.forRoot(markdownParserConfig),
        LevelMaterialModule,
        TopologyGraphModule,
        FormsModule,
        MatToolbarModule,
    ],
    declarations: [
        AbstractLevelComponent,
        InfoLevelComponent,
        TrainingLevelComponent,
        AccessLevelComponent,
        AssessmentLevelComponent,
        TraineeQuestionComponent,
        FreeFormQuestionTraineeComponent,
        MultipleChoiceQuestionTraineeComponent,
        ExtendedMatchingItemsTraineeComponent,
        FloatingAnswerFormComponent,
        AnswerFormHintsComponent,
        SplitContainerComponent,
        GenericSandboxLevelComponent,
        TopologyWrapperComponent,
        TrainingTimerComponent,
    ],
    exports: [
        AbstractLevelComponent,
        InfoLevelComponent,
        TrainingLevelComponent,
        AccessLevelComponent,
        AssessmentLevelComponent,
        TraineeQuestionComponent,
        FreeFormQuestionTraineeComponent,
        MultipleChoiceQuestionTraineeComponent,
        ExtendedMatchingItemsTraineeComponent,
    ],
    providers: [
        { provide: DividerPositionSynchronizerService, useClass: PersistentDividerPositionSynchronizerService },
    ],
})
export class LevelComponentsModule {}
