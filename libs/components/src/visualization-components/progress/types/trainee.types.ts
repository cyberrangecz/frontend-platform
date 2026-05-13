import { TraineeId } from './ids.types';

/**
 * Per-trainee view-model slice. One entry per visible trainee row in the
 * order they appear top-to-bottom on the Y-axis.
 *
 * The avatar dataURL arrives base64-encoded; the option-builder is responsible
 * for prepending the `data:image/png;base64,` prefix if missing.
 */
export interface TraineeVm {
    readonly id: TraineeId;
    readonly rowIndex: number;
    readonly displayName: string;
    readonly avatarDataUrl: string;
    readonly isFavourited: boolean;
}
