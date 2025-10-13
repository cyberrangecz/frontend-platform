import {AssessmentAnswer, AssessmentQuestion} from '@crczp/visualization-model';
import {FFQTableRow} from './ffq-table-row';

export class FFQTableAdapter {
    rows: FFQTableAdapter[];

    constructor(question: AssessmentQuestion) {
        const answers: AssessmentAnswer[] = question.answers as AssessmentAnswer[];
        this.rows = [];
        this.rows = [].concat(
            ...answers.map((answer) => {
                return answer.participants.map((participant) => {
                    const row = new FFQTableRow();
                    row.answer = answer.text;
                    row.isCorrect = answer.correct;
                    row.participant = participant;
                    return row;
                });
            }),
        );
    }
}
