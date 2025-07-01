import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrainingAgendaConfig } from '@crczp/training-agenda';
import { AdaptiveDefintionSummaryMaterialModule } from './adaptive-definition-summary-material.module';
import { RouterModule } from '@angular/router';
import { AdaptiveDefinitionInfoComponent } from './info/adaptive-definition-info.component';
import { AdaptiveDefinitionSummaryComponent } from './adaptive-definition-summary.component';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { AdaptiveDefinitionPhasesDetailComponent } from './phases/adaptive-definition-phases.component';
import { InfoPhaseDetailComponent } from './phases/phase/info/info-phase-detail.component';
import { AbstractPhaseDetailComponent } from './phases/phase/abstract-phase-detail.component';
import { TrainingPhaseDetailComponent } from './phases/phase/training/training-phase-detail.component';
import { QuestionnairePhaseDetailComponent } from './phases/phase/questionnaire/questionnaire-phase-detail.component';
import { AbstractQuestionComponent } from './phases/phase/questionnaire/abstract-question/abstract-question.component';
import {
    FreeFormQuestionDetailComponent
} from './phases/phase/questionnaire/abstract-question/free-form-question-detail/free-form-question-detail.component';
import {
    MultipleChoiceQuestionDetailComponent
} from './phases/phase/questionnaire/abstract-question/multiple-choice-question-detail/multiple-choice-question-detail.component';
import {
    RatingFormQuestionDetailComponent
} from './phases/phase/questionnaire/abstract-question/rating-form-question-detail/rating-form-question-detail.component';
import { AccessPhaseDetailComponent } from './phases/phase/access/access-phase-detail.component';
import { MarkedOptions, SentinelMarkdownViewModule } from '@sentinel/components/markdown-view';

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

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        AdaptiveDefintionSummaryMaterialModule,
        SentinelMarkdownViewModule.forRoot(markdownParserConfig),
        SentinelControlsComponent,
    ],
    declarations: [
        AdaptiveDefinitionSummaryComponent,
        AdaptiveDefinitionInfoComponent,
        AdaptiveDefinitionPhasesDetailComponent,
        InfoPhaseDetailComponent,
        AbstractPhaseDetailComponent,
        TrainingPhaseDetailComponent,
        QuestionnairePhaseDetailComponent,
        AbstractQuestionComponent,
        FreeFormQuestionDetailComponent,
        MultipleChoiceQuestionDetailComponent,
        RatingFormQuestionDetailComponent,
        AccessPhaseDetailComponent,
    ],
})
export class AdaptiveDefinitionSummaryComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<AdaptiveDefinitionSummaryComponentsModule> {
        return {
            ngModule: AdaptiveDefinitionSummaryComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
