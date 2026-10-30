import { describe, expect, it } from 'vitest';
import { formatJsonInLine, formatJsonInText } from './format-json-fragments';
import { ANSIBLE_RESULT_START } from './highlighting/ansible-highlighting';
import { medianRunTime } from './highlighting/highlighting-testing';

const formatResultsInLine = (line: string): string =>
    formatJsonInLine(line, ANSIBLE_RESULT_START);

describe('formatJsonInLine', () => {
    it('indents an Ansible result payload and keeps the surrounding text', () => {
        expect(
            formatResultsInLine(
                'ok: [web] => {"changed": false, "msg": "done"}',
            ),
        ).toBe('ok: [web] => {\n  "changed": false,\n  "msg": "done"\n}');
    });

    it('formats a fatal line with a trailing array of objects', () => {
        expect(
            formatResultsInLine(
                'fatal: [web]: FAILED! => {"results": [{"a": 1}]}',
            ),
        ).toBe(
            'fatal: [web]: FAILED! => {\n  "results": [\n    {\n      "a": 1\n    }\n  ]\n}',
        );
    });

    it('keeps numbers exactly as written', () => {
        const formatted = formatResultsInLine(
            'x => {"version":3.10,"big":12345678901234567890,"exp":1E+5,"neg":-0.0}',
        );
        expect(formatted).toContain('"version": 3.10');
        expect(formatted).toContain('"big": 12345678901234567890');
        expect(formatted).toContain('"exp": 1E+5');
        expect(formatted).toContain('"neg": -0.0');
    });

    it('keeps duplicate keys', () => {
        expect(formatResultsInLine('x => {"a":1,"a":2}')).toBe(
            'x => {\n  "a": 1,\n  "a": 2\n}',
        );
    });

    it('keeps string contents, brackets and escaped quotes inside strings', () => {
        const line =
            'x => {"msg": "bad ] } \\" , { [ \\u00e9 \\\\", "k": "  spaced  "}';
        expect(formatResultsInLine(line)).toBe(
            'x => {\n  "msg": "bad ] } \\" , { [ \\u00e9 \\\\",\n  "k": "  spaced  "\n}',
        );
    });

    it('formats nested fragments', () => {
        expect(formatResultsInLine('x => {"a":{"b":[1,[2]]},"c":{}}')).toBe(
            'x => {\n  "a": {\n    "b": [\n      1,\n      [\n        2\n      ]\n    ]\n  },\n  "c": {}\n}',
        );
    });

    it('formats every result on one line', () => {
        expect(formatResultsInLine('a => {"x":1} b => {"y":2} c')).toBe(
            'a => {\n  "x": 1\n} b => {\n  "y": 2\n} c',
        );
    });

    it('keeps true, false and null', () => {
        expect(
            formatResultsInLine('x => {"a":true,"b":false,"c":null}'),
        ).toBe('x => {\n  "a": true,\n  "b": false,\n  "c": null\n}');
    });

    it('formats an array holding objects', () => {
        expect(formatResultsInLine('x => [{"a":1},{"b":2}]')).toBe(
            'x => [\n  {\n    "a": 1\n  },\n  {\n    "b": 2\n  }\n]',
        );
    });

    it.each([
        '[WARNING]: unexpected body {"status": 500, "detail": "x"}',
        '{"a": 1}',
        'msg: {"a": 1} => done',
        'x =>{"a": 1}',
    ])('leaves JSON that does not begin right after a result start unchanged: %s', (line) => {
        expect(formatResultsInLine(line)).toBe(line);
    });

    it('formats only the fragments beginning after a match of the given start', () => {
        expect(
            formatJsonInLine('a {"x":1} b: {"y":2}', /:/),
        ).toBe('a {"x":1} b: {\n  "y": 2\n}');
    });

    it('formats after a start pattern that matches no characters', () => {
        expect(formatJsonInLine('a {"x":1} b {"y":2}', /(?=\{)/)).toBe(
            'a {\n  "x": 1\n} b {\n  "y": 2\n}',
        );
    });

    it.each([
        'TASK [Install nginx] ********',
        'ok: [web] => (item=[1, 2])',
        'ok: [web] => [1, 2]',
        'ok: [web] => []',
        'ok: [web] => {}',
        'plain text without brackets',
        '',
    ])('leaves non-JSON, empty or plain-array results unchanged: %s', (line) => {
        expect(formatResultsInLine(line)).toBe(line);
    });

    it.each([
        'x => {"a": 1',
        'x => {"a": 1,}',
        'x => {"a" 1}',
        'x => {"a": 01}',
        'x => {"a": 1.}',
        'x => {"a": "unterminated}',
        'x => {"a": "bad \\x escape"}',
        'x => {"a": [1}',
        'x => {a: 1}',
        'x => {"a": tru}',
        'x => {"a": truex}',
        'x => {"a": nullx, "b": 1}',
        "x => {'msg': \"it's done\"}",
    ])('leaves a malformed fragment unchanged: %s', (line) => {
        expect(formatResultsInLine(line)).toBe(line);
    });

    it('formats a valid fragment after a malformed one on the same line', () => {
        expect(formatResultsInLine('x => {"a": 1,} then => {"b": 2}')).toBe(
            'x => {"a": 1,} then => {\n  "b": 2\n}',
        );
    });

    it('leaves nesting beyond the depth limit unchanged', () => {
        const line = `x => ${'['.repeat(50_000)}`;
        expect(formatResultsInLine(line)).toBe(line);
    });

    it('formats the fragments before one the line end cuts short and leaves the rest unchanged', () => {
        expect(
            formatResultsInLine(
                'ok: [a] => {"rc": 1} then => {"m": "y => [[1]]", "n": tr',
            ),
        ).toBe(
            'ok: [a] => {\n  "rc": 1\n} then => {"m": "y => [[1]]", "n": tr',
        );
    });

    it('formats a ~2k- and a ~8k-character unfinished line in time linear in their length', () => {
        const everyBracket = /(?=[{[])/;
        const unfinishedLine = (pieceCount: number): string =>
            `{"a": [${'{"b": 1}, '.repeat(pieceCount)}`;
        const shortLine = unfinishedLine(200);
        const longLine = unfinishedLine(800);
        const ratio =
            medianRunTime(() => formatJsonInLine(longLine, everyBracket)) /
            medianRunTime(() => formatJsonInLine(shortLine, everyBracket));

        expect(formatJsonInLine(longLine, everyBracket)).toBe(longLine);
        expect(ratio).toBeLessThan(9);
    });
});

describe('formatJsonInText', () => {
    it('formats each line on its own and keeps other lines', () => {
        expect(
            formatJsonInText('TASK [x]\nok: [h] => {"a":1}\n', ANSIBLE_RESULT_START),
        ).toBe('TASK [x]\nok: [h] => {\n  "a": 1\n}\n');
    });

    it('gives the same result for appended text formatted separately', () => {
        const first = 'ok: [h] => {"a":1}\n';
        const appended = 'ok: [h2] => {"b":2}';
        expect(
            formatJsonInText(first, ANSIBLE_RESULT_START) +
                formatJsonInText(appended, ANSIBLE_RESULT_START),
        ).toBe(formatJsonInText(first + appended, ANSIBLE_RESULT_START));
    });
});
