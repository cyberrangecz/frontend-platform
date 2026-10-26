import type { FullConfig, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { renderSlideshowPage } from './slideshow-page';
import {
    groupIntoSegmentDrafts,
    type CollectedTest,
    type SegmentMember,
    type SlideshowClip,
    type SlideshowSegment,
} from './slideshow-segments';
import { VISUAL_CHECK_ATTACHMENT, type SlideshowVisualCheck, type VisualCheckRecord } from './visual-check';

export interface SlideshowOptions {
    /** Folder receiving `index.html`, `manifest.json` and the copied media, relative to the config. */
    outputFolder: string;
}

const MEDIA_FOLDER = 'media';

/**
 * Gathers the videos and screenshots of every test into one folder and writes an HTML player that
 * plays the run as one timeline of segments, each segment showing the browsers' clips of one test
 * in parallel, plus a `manifest.json` describing the same segments and listing the moments of the
 * videos to be reviewed by eye.
 */
export default class SlideshowReporter implements Reporter {
    private readonly latestAttempts = new Map<string, CollectedTest>();
    private outputFolder = '';

    constructor(private readonly options: SlideshowOptions) {}

    onBegin(config: FullConfig): void {
        const configFolder = config.configFile ? dirname(config.configFile) : config.rootDir;
        this.outputFolder = resolve(configFolder, this.options.outputFolder);
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        this.latestAttempts.set(test.id, { test, result });
    }

    onEnd(): void {
        rmSync(this.outputFolder, { recursive: true, force: true });
        mkdirSync(join(this.outputFolder, MEDIA_FOLDER), { recursive: true });
        const visualChecks: SlideshowVisualCheck[] = [];
        const segments = groupIntoSegmentDrafts(this.latestAttempts.values()).map(
            (draft, index): SlideshowSegment => ({
                index,
                stage: draft.stage,
                ...(draft.area === undefined ? {} : { area: draft.area }),
                file: draft.file,
                line: draft.line,
                title: draft.title,
                clips: draft.members.map((member) => {
                    const { clip, checks } = this.toClip(member, index);
                    visualChecks.push(...checks.map((check) => toVisualCheck(check, clip, index, draft.title)));
                    return clip;
                }),
            }),
        );
        writeFileSync(
            join(this.outputFolder, 'manifest.json'),
            JSON.stringify({ segments, visualChecks }, null, 2),
        );
        writeFileSync(join(this.outputFolder, 'index.html'), renderSlideshowPage(segments));
        console.log(`Slideshow: ${join(this.outputFolder, 'index.html')}`);
    }

    private toClip(
        { browser, collected: { test, result } }: SegmentMember,
        segmentIndex: number,
    ): { clip: SlideshowClip; checks: VisualCheckRecord[] } {
        const error = result.errors.map((problem) => problem.message ?? problem.value ?? '').join('\n\n');
        const clip: SlideshowClip = {
            browser,
            project: test.parent.project()?.name ?? '',
            status: result.status,
            expectedStatus: test.expectedStatus,
            durationMilliseconds: result.duration,
            ...(error ? { error } : {}),
            videos: [],
            screenshots: [],
        };
        const checks: VisualCheckRecord[] = [];
        result.attachments.forEach((attachment, position) => {
            if (attachment.name === 'diagnostics' && attachment.body) {
                clip.diagnostics = JSON.parse(attachment.body.toString('utf8'));
                return;
            }
            if (attachment.name === VISUAL_CHECK_ATTACHMENT && attachment.body) {
                checks.push(JSON.parse(attachment.body.toString('utf8')) as VisualCheckRecord);
                return;
            }
            const isVideo = attachment.contentType.startsWith('video/');
            const isImage = attachment.contentType.startsWith('image/');
            if (!isVideo && !isImage) {
                return;
            }
            const extension = attachment.path ? extname(attachment.path) : '.png';
            const relativePath = `${MEDIA_FOLDER}/${String(segmentIndex).padStart(5, '0')}-${browser}-${position}${extension}`;
            const target = join(this.outputFolder, relativePath);
            if (attachment.path && existsSync(attachment.path)) {
                copyFileSync(attachment.path, target);
            } else if (attachment.body) {
                writeFileSync(target, attachment.body);
            } else {
                return;
            }
            (isVideo ? clip.videos : clip.screenshots).push({ label: attachment.name, path: relativePath });
        });
        return { clip, checks };
    }
}

/** Resolves the attachment names of a visual check to the media files copied for its clip. */
function toVisualCheck(
    check: VisualCheckRecord,
    clip: SlideshowClip,
    segment: number,
    title: string,
): SlideshowVisualCheck {
    const video = clip.videos.find((media) => media.label === check.videoLabel)?.path;
    const screenshot = clip.screenshots.find((media) => media.label === check.screenshotLabel)?.path;
    return {
        segment,
        title,
        browser: clip.browser,
        label: check.label,
        shows: check.shows,
        ...(video === undefined ? {} : { video }),
        ...(screenshot === undefined ? {} : { screenshot }),
        atSeconds: check.atMilliseconds / 1000,
        holdSeconds: check.holdMilliseconds / 1000,
    };
}
