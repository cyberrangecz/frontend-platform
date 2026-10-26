import { Language } from '@codemirror/language';

const RUNS_PER_SAMPLE = 10;
const SAMPLE_COUNT = 7;

/**
 * Builds a function that tokenizes text in the language and lists each styled token as its kind
 * and covered text, such as `string:"done"`, the kind stripped of the language's name prefix.
 */
export function tokenizerFor(language: Language): (text: string) => string[] {
    const tokenNamePrefix = `${language.name}-`;
    return (text) => {
        const tokens: string[] = [];
        language.parser.parse(text).iterate({
            enter: (node) => {
                if (!node.type.isTop) {
                    const kind = node.name.slice(tokenNamePrefix.length);
                    tokens.push(`${kind}:${text.slice(node.from, node.to)}`);
                }
            },
        });
        return tokens;
    };
}

/**
 * Median time, in milliseconds, of several samples that each repeat the work a fixed number of
 * times, taken after a warm-up sample.
 *
 * @throws {Error} When the median sample is too short for the clock to measure.
 */
export function medianRunTime(work: () => void): number {
    const runSample = (): number => {
        const start = performance.now();
        for (let run = 0; run < RUNS_PER_SAMPLE; run++) {
            work();
        }
        return performance.now() - start;
    };
    runSample();
    const samples = Array.from({ length: SAMPLE_COUNT }, runSample).sort(
        (left, right) => left - right,
    );
    const median = samples[Math.floor(SAMPLE_COUNT / 2)];
    if (median === undefined || median <= 0) {
        throw new Error(
            `The median sample took ${median} ms, too short to time; give the work more input.`,
        );
    }
    return median;
}
