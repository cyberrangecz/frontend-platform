import { from, map, Observable, switchMap, throwError } from 'rxjs';

/** Reduces the decoded samples to the given number of bars, each the loudest sample of its slice, scaled so the loudest bar is 1. */
export function computePeaks(channels: readonly Float32Array[], barCount: number): number[] {
    const sampleCount = channels[0]?.length ?? 0;
    const peaks = new Array<number>(barCount).fill(0);
    if (sampleCount === 0) {
        return peaks;
    }
    for (const samples of channels) {
        for (let bar = 0; bar < barCount; bar++) {
            const start = Math.floor((bar * sampleCount) / barCount);
            const end = Math.max(start + 1, Math.floor(((bar + 1) * sampleCount) / barCount));
            for (let index = start; index < end; index++) {
                peaks[bar] = Math.max(peaks[bar], Math.abs(samples[index]));
            }
        }
    }
    const loudest = Math.max(...peaks);
    return loudest > 0 ? peaks.map((peak) => peak / loudest) : peaks;
}

/** Decodes the audio behind an object URL and emits its bars once; errors when the bytes are not decodable audio. */
export function decodePeaks(url: string, barCount: number): Observable<number[]> {
    return from(fetch(url)).pipe(
        switchMap((response) => (response.ok ? from(response.arrayBuffer()) : throwError(() => new Error(`The audio could not be read (HTTP ${response.status}).`)))),
        switchMap((bytes) => from(new OfflineAudioContext(1, 1, 44100).decodeAudioData(bytes))),
        map((audio) => computePeaks(Array.from({ length: audio.numberOfChannels }, (_, channel) => audio.getChannelData(channel)), barCount)),
    );
}
