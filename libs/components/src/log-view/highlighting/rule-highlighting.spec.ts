import { medianRunTime, tokenizerFor } from './highlighting-testing';
import {
    defineRuleHighlighting,
    RuleHighlightingDefinition,
} from './rule-highlighting';

type TestKind = 'header' | 'boolean' | 'string' | 'recapCount' | 'marker';
type TestMode = 'main' | 'recap';

const TEST_STYLE = { color: '#000000' };

const testDefinition: RuleHighlightingDefinition<TestKind, TestMode> = {
    name: 'test',
    tokens: {
        header: TEST_STYLE,
        boolean: TEST_STYLE,
        string: TEST_STYLE,
        recapCount: TEST_STYLE,
        marker: TEST_STYLE,
    },
    initialMode: 'main',
    modes: {
        main: {
            rules: [
                {
                    pattern: /PLAY RECAP .*/,
                    token: 'header',
                    atLineStart: true,
                    enterMode: 'recap',
                },
                { pattern: /PLAY \[.*/, token: 'header', atLineStart: true },
                { pattern: /x*/, token: 'marker' },
                { pattern: /(?=y)/, token: 'marker' },
                { pattern: /true\b/, token: 'boolean' },
                { pattern: /"[^"]*"/, token: 'string' },
            ],
        },
        recap: {
            leaveAt: /PLAY \[|$/,
            rules: [{ pattern: /[a-z]+=\d+/, token: 'recapCount' }],
        },
    },
};

const [testLanguage] = defineRuleHighlighting(testDefinition);
const tokenize = tokenizerFor(testLanguage);

describe('defineRuleHighlighting', () => {
    it('gives matched text the token kind of its rule', () => {
        expect(tokenize('flag true and "quoted"')).toEqual([
            'boolean:true',
            'string:"quoted"',
        ]);
    });

    it('keeps a kind named like a built-in CodeMirror token as its own kind', () => {
        expect(tokenize('PLAY [first]')).toEqual(['header:PLAY [first]']);
    });

    it('ignores rules whose pattern matches zero characters', () => {
        expect(tokenize('a y b')).toEqual([]);
        expect(tokenize('xx y')).toEqual(['marker:xx']);
    });

    it('consumes uncovered text in word runs, so a rule never starts mid-word', () => {
        expect(tokenize('untrue true')).toEqual(['boolean:true']);
    });

    it('applies line start rules only at the first position of a line', () => {
        expect(tokenize('PLAY [first] ***\nsee PLAY [first]')).toEqual([
            'header:PLAY [first] ***',
        ]);
    });

    it('ends every token at its line, so an unclosed quote stays on its line', () => {
        expect(tokenize(`it isn't "open\n"closed" true`)).toEqual([
            'string:"closed"',
            'boolean:true',
        ]);
    });

    it('reads lines after a mode header in that mode until a blank line leaves it', () => {
        expect(
            tokenize('PLAY RECAP ***\nhost : ok=1 true\n\nok=2 true'),
        ).toEqual(['header:PLAY RECAP ***', 'recapCount:ok=1', 'boolean:true']);
    });

    it('reads the line that leaves a mode in the initial mode', () => {
        expect(
            tokenize('PLAY RECAP ***\nhost : ok=1\nPLAY [second]\nok=2'),
        ).toEqual([
            'header:PLAY RECAP ***',
            'recapCount:ok=1',
            'header:PLAY [second]',
        ]);
    });

    it('tokenizes a ~2k- and a ~8k-character line in time linear in their length', () => {
        const prose = 'the task isn\'t "done" yet, retry=3 true; ';
        const shortLine = prose.repeat(50);
        const longLine = prose.repeat(200);
        const ratio =
            medianRunTime(() => tokenize(longLine)) /
            medianRunTime(() => tokenize(shortLine));

        expect(ratio).toBeLessThan(9);
    });
});
