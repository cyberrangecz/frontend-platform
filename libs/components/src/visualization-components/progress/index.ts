/**
 * Public surface of the progress visualization module.
 *
 * Component consumers import only from here. Internal layers
 * (sources, selectors, option-builders, config) are accessed via
 * deep paths within the module and are not re-exported.
 */

// Component
export { ProgressVisualizationComponent } from './components/progress-visualization.component';

// Service contracts (DI tokens)
export { ProgressFeedService } from './services/progress-feed.interface.service';
export { ProgressUiStateService } from './services/progress-ui-state.interface.service';
export { ChartRendererService } from './services/chart-renderer.interface.service';

// Public types — anything a consumer might receive or pass in
export type { InstanceId, TraineeId, LevelId, TrainingRunId, BarKey } from './types/ids.types';
export { asInstanceId, asTraineeId, asLevelId, asTrainingRunId, asBarKey } from './types/ids.types';

export type { LagState } from './types/lag-state.types';
export { LAG_STATES, LAG_STATES_FILTERABLE } from './types/lag-state.types';

export type { SortCriterion, SortDirection } from './types/ui-state.types';
export { SORT_CRITERIA } from './types/ui-state.types';

export type { ViewModel, LiveViewModel, SkeletonViewModel } from './types/view-model.types';
