import {AbstractPhaseTypeEnum, AdaptiveTask, TrainingPhase, TrainingUser} from '@crczp/training-model';
import {
    AccessPhaseTask,
    AccessTransitionPhase,
    AdaptiveRunVisualization,
    InfoPhaseTask,
    InfoTransitionPhase,
    QuestionnairePhaseTaskVisuazlization,
    QuestionnaireTransitionPhase,
    RunVisualizationPathNode,
    TransitionPhase
} from '@crczp/visualization-model';

export class SimulatorMapper {
    static toCreatePathNode(task: AdaptiveTask, phase: TrainingPhase): RunVisualizationPathNode {
        const pathNode = new RunVisualizationPathNode();
        pathNode.phaseId = phase.id;
        pathNode.phaseOrder = phase.order;
        pathNode.taskId = task.id;
        pathNode.taskOrder = task.order;
        return pathNode;
    }

    /**
     * Creates default objects for transition visualization
     */

    static createTrainee(): AdaptiveRunVisualization {
        const runData = new AdaptiveRunVisualization();
        runData.trainee = new TrainingUser();
        runData.trainee.id = 1;
        runData.trainee.name = 'TrainingUser';
        runData.trainingRunId = 1;
        runData.trainingRunPathNodes = [];
        return runData;
    }

    static createInfoPhaseTask(): InfoPhaseTask {
        const infoTask = new InfoPhaseTask();
        infoTask.id = 0;
        infoTask.order = 0;
        infoTask.content = '';
        return infoTask;
    }

    static createQuestionnairePhaseTask(): QuestionnairePhaseTaskVisuazlization {
        const questionnaireTask = new QuestionnairePhaseTaskVisuazlization();
        questionnaireTask.order = 0;
        questionnaireTask.id = 0;
        questionnaireTask.questions = [];
        return questionnaireTask;
    }

    static createAccessPhaseTask(): AccessPhaseTask {
        const accessTask = new AccessPhaseTask();
        accessTask.id = 0;
        accessTask.order = 0;
        return accessTask;
    }

    static createNonTrainingPathNode(phase: TransitionPhase) {
        const pathNode = new RunVisualizationPathNode();
        pathNode.phaseId = phase.id;
        pathNode.phaseOrder = phase.order;
        pathNode.taskId = 0;
        pathNode.taskOrder = 0;
        switch (phase.type) {
            case AbstractPhaseTypeEnum.Access:
                (phase as unknown as AccessTransitionPhase).tasks = [SimulatorMapper.createAccessPhaseTask()];
                break;
            case AbstractPhaseTypeEnum.Info:
                (phase as unknown as InfoTransitionPhase).tasks = [SimulatorMapper.createInfoPhaseTask()];
                break;
            case AbstractPhaseTypeEnum.Questionnaire:
                (phase as unknown as QuestionnaireTransitionPhase).tasks = [SimulatorMapper.createQuestionnairePhaseTask()];
                break;
        }
        return pathNode;
    }
}
