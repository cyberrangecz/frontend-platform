import { LagState } from '../types/lag-state.types';

/**
 * Builds the canvas-pattern tile used by the estimate overlay's diagonal
 * stripes.
 *
 * One tile is pre-built per lag-state color at module load and cached.
 * The bars builder requests a tile from this cache by lag state.
 *
 * Tiles are `HTMLCanvasElement` instances; ECharts accepts them directly
 * as `style.fill.image` on `type: 'pattern'`.
 */
export function getEstimateStripeTile(_state: LagState): HTMLCanvasElement {
    throw new Error('not implemented');
}
