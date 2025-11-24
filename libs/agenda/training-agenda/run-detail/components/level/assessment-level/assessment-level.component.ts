import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
    QueryList,
    ViewChildren,
} from '@angular/core';
import {
    AssessmentLevel,
    AssessmentTypeEnum,
    Question,
} from '@crczp/training-model';
import { TraineeQuestionComponent } from './question/trainee-question.component';

import { LinearAssessmentLevelService } from '../../../services/training-run/level/assessment/linear-assessment-level.service';
import { SentinelMarkdownViewComponent } from '@sentinel/components/markdown-view';
import { MatDivider } from '@angular/material/divider';

import { MatButton } from '@angular/material/button';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs/operators';

@Component({
    selector: 'crczp-assessment-level',
    templateUrl: './assessment-level.component.html',
    styleUrls: ['./assessment-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [LinearAssessmentLevelService],
    imports: [
        SentinelMarkdownViewComponent,
        MatDivider,
        TraineeQuestionComponent,
        MatButton,
        MatButton,
        AsyncPipe,
    ],
})
/**
 * Component that displays assessment level in a trainees training run. If the questions are type of test, trainee needs
 * to answer all the questions before he can continue to the next level. If the type is questionnaire, trainee can skip
 * answering the questions.
 */
export class AssessmentLevelComponent implements OnInit {
    @ViewChildren(TraineeQuestionComponent)
    questionComponents: QueryList<TraineeQuestionComponent>;
    canSubmit: boolean;
    protected readonly assessmentService = inject(LinearAssessmentLevelService);
    protected readonly runService = inject(AbstractTrainingRunService);

    get level$() {
        return this.runService.runInfo$.pipe(
            map((runInfo) => runInfo.displayedLevel as AssessmentLevel),
        );
    }

    ngOnInit(): void {
        this.level$.subscribe((level) => this.initCanSubmit(level));
    }

    /**
     * When user changes his answers, check if answers are valid (and can be submitted) is done
     */
    onContentChanged(): void {
        this.checkCanSubmit();
    }

    /**
     * Gathers all trainees answers and calls service to save then
     */
    submit(): void {
        const results: Question[] = [];
        this.questionComponents.forEach((component) => {
            component.saveChanges();
            results.push(component.question);
        });
        this.sendSubmitRequest(results);
    }

    private sendSubmitRequest(answers: Question[]) {
        this.assessmentService.submit(answers);
    }

    private checkCanSubmit() {
        this.canSubmit = this.questionComponents
            .toArray()
            .every((component) => component.canBeSubmitted());
    }

    private initCanSubmit(level: AssessmentLevel) {
        if (level.assessmentType === AssessmentTypeEnum.Test) {
            this.canSubmit = false;
            return;
        } else {
            if (level.questions.some((question) => question.required)) {
                this.canSubmit = false;
                return;
            }
        }
        this.canSubmit = true;
    }
}
