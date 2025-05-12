import { TrainingNavigator } from './training-navigator.service';

import { Injectable } from '@angular/core';
import {
    ACCESS_TOKEN_PATH,
    ADAPTIVE_DEFINITION_DETAIL_PATH,
    ADAPTIVE_DEFINITION_PATH,
    ADAPTIVE_INSTANCE_PATH,
    ADAPTIVE_RUN_PATH,
    ADAPTIVE_RUN_RESULTS_PATH,
    CHEATING_DETECTION_CREATE_PATH,
    CHEATING_DETECTION_EVENT_DETAIL_PATH,
    CHEATING_DETECTION_EVENTS_PATH,
    CHEATING_DETECTION_PATH,
    MITRE_TECHNIQUES_PATH,
    PROGRESS_PATH,
    RESULTS_PATH,
    RUNS_PATH,
    SANDBOX_POOL_PATH,
    SIMULATOR_PATH,
    SUMMARY_PATH,
    TRAINING_DEFINITION_DETAIL_PATH,
    TRAINING_DEFINITION_EDIT_PATH,
    TRAINING_DEFINITION_NEW_PATH,
    TRAINING_DEFINITION_PATH,
    TRAINING_DEFINITION_PREVIEW_PATH,
    TRAINING_INSTANCE_DETAIL_PATH,
    TRAINING_INSTANCE_EDIT_PATH,
    TRAINING_INSTANCE_NEW_PATH,
    TRAINING_INSTANCE_PATH,
    TRAINING_RUN_ACCESS_PATH,
    TRAINING_RUN_PATH,
    TRAINING_RUN_RESULTS_AGGREGATED_DASHBOARD_PATH,
    TRAINING_RUN_RESULTS_PATH,
    TRAINING_RUN_RESUME_PATH,
} from '../model/default-paths';

@Injectable()
export class TrainingDefaultNavigator extends TrainingNavigator {
    /**
     * Returns route to training definition overview page
     */
    toTrainingDefinitionOverview(): string {
        return TRAINING_DEFINITION_PATH;
    }

    /**
     * Returns route to adaptive definition overview page
     */
    toAdaptiveDefinitionOverview(): string {
        return ADAPTIVE_DEFINITION_PATH;
    }

    /**
     * Returns route to mitre techniques
     */
    toMitreTechniques(): string {
        return `${MITRE_TECHNIQUES_PATH}`;
    }

    /**
     * Return route to adaptive simulator
     */
    toSimulator(): string {
        return `${ADAPTIVE_DEFINITION_PATH}/${SIMULATOR_PATH}`;
    }

    /**
     * Returns route to training run mitre techniques
     */
    toTrainingRunMitreTechniques(): string {
        return `${TRAINING_RUN_PATH}/${MITRE_TECHNIQUES_PATH}`;
    }

    /**
     * Returns route to training definition preview page
     * @param id id of the training definition
     */
    toTrainingDefinitionPreview(id: number | string): string {
        return `${TRAINING_DEFINITION_PATH}/${id}/${TRAINING_DEFINITION_PREVIEW_PATH}`;
    }

    /**
     * Returns route to adaptive definition preview page
     * @param id id of the training definition
     */
    toAdaptiveDefinitionPreview(id: number | string): string {
        return `${ADAPTIVE_DEFINITION_PATH}/${id}/${TRAINING_DEFINITION_PREVIEW_PATH}`;
    }

    /**
     * Returns route to training definition edit page
     * @param id id of the training definition
     */
    toTrainingDefinitionEdit(id: number | string): string {
        return `${TRAINING_DEFINITION_PATH}/${id}/${TRAINING_DEFINITION_EDIT_PATH}`;
    }

    /**
     * Returns route to training definition edit page
     * @param id id of the training definition
     */
    toAdaptiveDefinitionEdit(id: number | string): string {
        return `${ADAPTIVE_DEFINITION_PATH}/${id}/${TRAINING_DEFINITION_EDIT_PATH}`;
    }

    /**
     * Returns route to new training definition page
     */
    toNewTrainingDefinition(): string {
        return `${TRAINING_DEFINITION_PATH}/${TRAINING_DEFINITION_NEW_PATH}`;
    }

    toNewAdaptiveDefinition(): string {
        return `${ADAPTIVE_DEFINITION_PATH}/${TRAINING_DEFINITION_NEW_PATH}`;
    }

    /**
     * Returns route to training definition detail page
     * @param id id of the training definition
     */
    toTrainingDefinitionDetail(id: number): string {
        return `${TRAINING_DEFINITION_PATH}/${id}/${TRAINING_DEFINITION_DETAIL_PATH}`;
    }

    /**
     * Returns route to training instance overview page
     */
    toTrainingInstanceOverview(): string {
        return TRAINING_INSTANCE_PATH;
    }

    /**
     * Returns route to adaptive instance overview page
     */
    toAdaptiveInstanceOverview(): string {
        return ADAPTIVE_INSTANCE_PATH;
    }

    /**
     * Returns route to training instance edit page
     * @param id id of the training instance
     */
    toTrainingInstanceEdit(id: number | string): string {
        return `${TRAINING_INSTANCE_PATH}/${id}/${TRAINING_INSTANCE_EDIT_PATH}`;
    }

    /**
     * Returns route to adaptive instance edit page
     * @param id id of the training instance
     */
    toAdaptiveInstanceEdit(id: number | string): string {
        return `${ADAPTIVE_INSTANCE_PATH}/${id}/${TRAINING_INSTANCE_EDIT_PATH}`;
    }

    /**
     * Returns route to training instance detail page
     * @param id id of the training instance
     */
    toTrainingInstanceDetail(id: number | string): string {
        return `${TRAINING_INSTANCE_PATH}/${id}/${TRAINING_INSTANCE_DETAIL_PATH}`;
    }

    /**
     * Returns route to adaptive instance detail page
     * @param id id of the training instance
     */
    toAdaptiveInstanceDetail(id: number | string): string {
        return `${ADAPTIVE_INSTANCE_PATH}/${id}/${TRAINING_INSTANCE_DETAIL_PATH}`;
    }

    /**
     * Returns route to training instance access token page
     * @param id id of the training instance
     */
    toTrainingInstanceAccessToken(id: number | string): string {
        return `${this.toTrainingInstanceDetail(id)}/${ACCESS_TOKEN_PATH}`;
    }

    /**
     * Returns route to adaptive instance access token page
     * @param id id of the adaptive instance
     */
    toAdaptiveInstanceAccessToken(id: number | string): string {
        return `${this.toAdaptiveInstanceDetail(id)}/${ACCESS_TOKEN_PATH}`;
    }

    /**
     * Returns route to training instance summary page
     * @param id id of the training instance
     */
    toTrainingInstanceSummary(id: number | string): string {
        return `${this.toTrainingInstanceDetail(id)}/${SUMMARY_PATH}`;
    }

    /**
     * Returns route to adaptive instance summary page
     * @param id id of the adaptive instance
     */
    toAdaptiveInstanceSummary(id: number | string): string {
        return `${this.toAdaptiveInstanceDetail(id)}/${SUMMARY_PATH}`;
    }

    /**
     * Returns route to training instance progress page
     * @param id id of the training instance
     */
    toTrainingInstanceProgress(id: number | string): string {
        return `${this.toTrainingInstanceDetail(id)}/${PROGRESS_PATH}`;
    }

    /**
     * Returns route to adaptive instance progress page
     * @param id id of the adaptive instance
     */
    toAdaptiveInstanceProgress(id: number | string): string {
        return `${this.toAdaptiveInstanceDetail(id)}/${PROGRESS_PATH}`;
    }

    /**
     * Returns route to training instance results page
     * @param id id of the training instance
     */
    toTrainingInstanceResults(id: number | string): string {
        return `${this.toTrainingInstanceDetail(id)}/${RESULTS_PATH}`;
    }

    /**
     * Returns route to training instance aggregated results page
     * @param id id of the training instance
     */
    toTrainingInstanceAggregatedResults(id: number | string): string {
        return `${this.toTrainingInstanceDetail(id)}/${RESULTS_PATH}/${TRAINING_RUN_RESULTS_AGGREGATED_DASHBOARD_PATH}`;
    }

    toTrainingInstanceCheatingDetection(id: number | string): string {
        return `${this.toTrainingInstanceDetail(id)}/${CHEATING_DETECTION_PATH}`;
    }

    toTrainingInstanceCheatingDetectionCreate(id: number | string): string {
        return `${this.toTrainingInstanceDetail(id)}/${CHEATING_DETECTION_PATH}/${CHEATING_DETECTION_CREATE_PATH}`;
    }

    toTrainingInstanceCheatingDetectionEvents(tid: number | string, cid: number | string): string {
        return `${this.toTrainingInstanceDetail(tid)}/${CHEATING_DETECTION_PATH}/${cid}/${CHEATING_DETECTION_EVENTS_PATH}`;
    }

    toTrainingInstanceCheatingDetectionEventDetail(
        tid: number | string,
        cid: number | string,
        eventId: number,
    ): string {
        return `${this.toTrainingInstanceDetail(
            tid,
        )}/${CHEATING_DETECTION_PATH}/${cid}/${CHEATING_DETECTION_EVENTS_PATH}/${eventId}/${CHEATING_DETECTION_EVENT_DETAIL_PATH}`;
    }

    /**
     * Returns route to adaptive instance results page
     * @param id id of the adaptive instance
     */
    toAdaptiveInstanceResults(id: number | string): string {
        return `${this.toAdaptiveInstanceDetail(id)}/${RESULTS_PATH}`;
    }

    /**
     * Returns route to training instance runs page
     * @param id id of the training instance
     */
    toTrainingInstanceRuns(id: number | string): string {
        return `${this.toTrainingInstanceDetail(id)}/${RUNS_PATH}`;
    }

    /**
     * Returns route to adaptive instance runs page
     * @param id id of the adaptive instance
     */
    toAdaptiveInstanceRuns(id: number | string): string {
        return `${this.toAdaptiveInstanceDetail(id)}/${RUNS_PATH}`;
    }

    /**
     * Returns route to new training instance page
     */
    toNewTrainingInstance(): string {
        return `${TRAINING_INSTANCE_PATH}/${TRAINING_INSTANCE_NEW_PATH}`;
    }

    /**
     * Returns route to new training instance page
     */
    toNewAdaptiveInstance(): string {
        return `${ADAPTIVE_INSTANCE_PATH}/${TRAINING_INSTANCE_NEW_PATH}`;
    }

    toTrainingRunOverview(): string {
        return TRAINING_RUN_PATH;
    }

    /**
     * Returns route to training run training page
     * @param id id of the training run
     */
    toResumeTrainingRun(id: number | string): string {
        return `${TRAINING_RUN_PATH}/${TRAINING_RUN_RESUME_PATH}/${id}`;
    }

    /**
     * Returns route to adaptive run training page
     * @param id id of the adaptive run
     */
    toResumeAdaptiveRun(id: number | string): string {
        return `${TRAINING_RUN_PATH}/${ADAPTIVE_RUN_PATH}/${TRAINING_RUN_RESUME_PATH}/${id}`;
    }

    toAccessTrainingRun(token: string): string {
        return `${TRAINING_RUN_PATH}/${TRAINING_RUN_ACCESS_PATH}/${token}`;
    }

    toAccessAdaptiveRun(token: string): string {
        return `${TRAINING_RUN_PATH}/${ADAPTIVE_RUN_PATH}/${TRAINING_RUN_ACCESS_PATH}/${token}`;
    }

    /**
     * Returns route to training run results page
     * @param id id of the training run
     */
    toTrainingRunResult(id: number | string): string {
        return `${TRAINING_RUN_PATH}/${TRAINING_RUN_RESULTS_PATH}/${id}`;
    }

    /**
     * Returns route to adaptive run results page
     * @param id id of the adaptive run
     */
    toAdaptiveRunResult(id: number | string): string {
        return `${TRAINING_RUN_PATH}/${ADAPTIVE_RUN_RESULTS_PATH}/${id}`;
    }

    toPool(id: number | string): string {
        return `${SANDBOX_POOL_PATH}/${id}`;
    }

    /**
     * Returns route to adaptive definition detail page
     * @param id id of the adaptive definition
     */
    toAdaptiveDefinitionDetail(id: number): string {
        return `${ADAPTIVE_DEFINITION_PATH}/${id}/${ADAPTIVE_DEFINITION_DETAIL_PATH}`;
    }
}
