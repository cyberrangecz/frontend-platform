import { LiveViewModel } from './live-view-model.types';
import { SkeletonViewModel } from './skeleton-view-model.types';

/**
 * The single shape that crosses the source → selector → option-builder
 * boundary. Discriminated by the `mode` tag.
 */
export type ViewModel = LiveViewModel | SkeletonViewModel;
