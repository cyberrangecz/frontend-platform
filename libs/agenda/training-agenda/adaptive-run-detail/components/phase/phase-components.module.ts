import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopologyGraphModule } from '@crczp/topology-graph';
import { PhaseMaterialModule } from './phase-material.module';
import { AbstractPhaseComponent } from './abstract-phase.component';
import { InfoPhaseComponent } from './info-phase/info-phase.component';
import { QuestionnairePhaseComponent } from './questionnaire-phase/questionnaire-phase.component';
import { TrainingPhaseComponent } from './sandbox-interaction-phase/training-phase/training-phase.component';
import { AccessPhaseComponent } from './sandbox-interaction-phase/access-phase/access-phase.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MarkedOptions, SentinelMarkdownViewModule } from '@sentinel/components/markdown-view';
import { GenericSandboxPhaseComponent } from './sandbox-interaction-phase/generic-sandbox-phase/generic-sandbox-phase.component';
import { FloatingAnswerFormComponent } from './sandbox-interaction-phase/subcomponents/answer-floating-form/floating-answer-form.component';
import { AnswerFormHintsComponent } from './sandbox-interaction-phase/subcomponents/answer-floating-form/answer-form-hints/answer-form-hints.component';
import { SplitContainerComponent } from './sandbox-interaction-phase/subcomponents/split-container/split-container.component';
import { TopologyWrapperComponent } from './sandbox-interaction-phase/subcomponents/topology-wrapper/topology-wrapper.component';
import { TrainingTimerComponent } from './training-timer/training-timer.component';
import { DividerPositionSynchronizerService } from '../../services/adaptive-run/synchronization/divider-position/divider-position-synchronizer.service';
import { PersistentDividerPositionSynchronizerService } from '../../services/adaptive-run/synchronization/divider-position/persistent-divider-position-synchronizer.service';

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
        TopologyGraphModule,
        FormsModule,
        PhaseMaterialModule,
        MatTabsModule,
    ],
    declarations: [
        AbstractPhaseComponent,
        InfoPhaseComponent,
        TrainingPhaseComponent,
        AccessPhaseComponent,
        GenericSandboxPhaseComponent,
        QuestionnairePhaseComponent,
        FloatingAnswerFormComponent,
        TopologyWrapperComponent,
        AnswerFormHintsComponent,
        SplitContainerComponent,
        TrainingTimerComponent,
    ],
    exports: [
        AbstractPhaseComponent,
        InfoPhaseComponent,
        TrainingPhaseComponent,
        AccessPhaseComponent,
        GenericSandboxPhaseComponent,
        QuestionnairePhaseComponent,
    ],
    providers: [
        { provide: DividerPositionSynchronizerService, useClass: PersistentDividerPositionSynchronizerService },
    ],
})
export class PhaseComponentsModule {}
