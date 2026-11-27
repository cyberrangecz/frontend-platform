import { ResourceRef } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { decodePeaks } from '../attachment/audio-peaks';

/** How many evenly spaced points a waveform's loudness is decoded to. */
const LOUDNESS_POINT_COUNT = 128;

/**
 * Decodes the sound behind a downloaded file's object URL into its loudness from 0 to 1 at evenly
 * spaced points, again whenever the URL changes; errors when the file holds no decodable sound.
 * Created in an injection context.
 */
export function loudnessOf(url: () => string | null): ResourceRef<number[] | undefined> {
    return rxResource({
        params: () => url() ?? undefined,
        stream: ({ params }) => decodePeaks(params, LOUDNESS_POINT_COUNT),
    });
}
