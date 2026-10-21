import type { TestCase, TestResult } from '@playwright/test/reporter';

export type SlideshowStage =
    | 'auth'
    | 'shared'
    | 'pages'
    | 'chain'
    | 'pool-actions'
    | 'runs-ready'
    | 'review'
    | 'destructive'
    | 'logout';

/** The recording of one test in one browser. */
export interface SlideshowClip {
    browser: string;
    project: string;
    status: TestResult['status'];
    expectedStatus: TestCase['expectedStatus'];
    durationMilliseconds: number;
    error?: string;
    videos: { label: string; path: string }[];
    screenshots: { label: string; path: string }[];
    diagnostics?: unknown;
}

/** One test identity of the run with the clips of every browser that ran it, played in parallel. */
export interface SlideshowSegment {
    index: number;
    stage: SlideshowStage;
    area?: string;
    file: string;
    line: number;
    title: string;
    clips: SlideshowClip[];
}

export interface CollectedTest {
    test: TestCase;
    result: TestResult;
}

export interface SegmentMember {
    browser: string;
    collected: CollectedTest;
}

/** A segment before its media is copied: the identity of a test and the runs that belong to it. */
export interface SegmentDraft {
    stage: SlideshowStage;
    area?: string;
    file: string;
    line: number;
    title: string;
    members: SegmentMember[];
}

const STAGE_ORDER: readonly SlideshowStage[] = [
    'auth',
    'shared',
    'pages',
    'chain',
    'pool-actions',
    'runs-ready',
    'review',
    'destructive',
    'logout',
];
const AREA_ORDER: readonly string[] = [
    'common',
    'sandbox-definition',
    'pool',
    'training-definition',
    'training-instance',
    'user-and-group',
];
const BROWSER_ORDER: readonly string[] = ['firefox', 'webkit', 'chromium'];

const STAGE_BY_PROJECT_SUFFIX: Readonly<Record<string, SlideshowStage>> = {
    chain: 'chain',
    'pool-actions': 'pool-actions',
    'runs-ready': 'runs-ready',
    review: 'review',
    destructive: 'destructive',
    logout: 'logout',
};

const PAGES_AREA_PATTERN = /[\\/]src[\\/]pages[\\/]([^\\/]+)[\\/]/;
const TITLE_PATH_ROOT_DEPTH = 3;

function rankOf(order: readonly string[], value: string): number {
    const position = order.indexOf(value);
    return position < 0 ? order.length : position;
}

/** Splits a Playwright project name into its stage and browser; `auth` and `shared` run in Chromium only. */
function identifyProject(projectName: string): { stage: SlideshowStage; browser: string } {
    if (projectName === 'auth' || projectName === 'shared') {
        return { stage: projectName, browser: 'chromium' };
    }
    const separator = projectName.indexOf('-');
    if (separator < 0) {
        return { stage: 'pages', browser: projectName };
    }
    const suffix = projectName.slice(separator + 1);
    return { stage: STAGE_BY_PROJECT_SUFFIX[suffix] ?? 'pages', browser: projectName.slice(0, separator) };
}

function compareDrafts(left: SegmentDraft, right: SegmentDraft): number {
    return (
        rankOf(STAGE_ORDER, left.stage) - rankOf(STAGE_ORDER, right.stage) ||
        rankOf(AREA_ORDER, left.area ?? '') - rankOf(AREA_ORDER, right.area ?? '') ||
        (left.area ?? '').localeCompare(right.area ?? '') ||
        left.file.localeCompare(right.file) ||
        left.line - right.line ||
        left.title.localeCompare(right.title)
    );
}

/**
 * Groups the runs of one test across browsers into drafts, ordered by stage, area, file, line and
 * title; the members of each draft follow the browser order of the player layout.
 */
export function groupIntoSegmentDrafts(collectedTests: Iterable<CollectedTest>): SegmentDraft[] {
    const draftsByIdentity = new Map<string, SegmentDraft>();
    for (const collected of collectedTests) {
        const { test } = collected;
        const { stage, browser } = identifyProject(test.parent.project()?.name ?? '');
        const title = test.titlePath().slice(TITLE_PATH_ROOT_DEPTH).join(' › ');
        const identity = [stage, test.location.file, title].join('\u0000');
        const area = stage === 'pages' ? PAGES_AREA_PATTERN.exec(test.location.file)?.[1] : undefined;
        const draft = draftsByIdentity.get(identity) ?? {
            stage,
            ...(area === undefined ? {} : { area }),
            file: test.location.file,
            line: test.location.line,
            title,
            members: [],
        };
        draft.line = Math.min(draft.line, test.location.line);
        draft.members.push({ browser, collected });
        draftsByIdentity.set(identity, draft);
    }
    const drafts = [...draftsByIdentity.values()];
    for (const draft of drafts) {
        draft.members.sort((left, right) => rankOf(BROWSER_ORDER, left.browser) - rankOf(BROWSER_ORDER, right.browser));
    }
    return drafts.sort(compareDrafts);
}
