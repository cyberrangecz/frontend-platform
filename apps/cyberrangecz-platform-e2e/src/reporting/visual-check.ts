/** Name of the JSON attachment a test adds for each moment its video is to be reviewed by eye. */
export const VISUAL_CHECK_ATTACHMENT = 'visual check';

/** A held, still moment in one video of a test and what the screen should show during it. */
export interface VisualCheckRecord {
    label: string;
    shows: string;
    /** Attachment name of the video the moment is in. */
    videoLabel: string;
    /** Offset of the moment from the start of that video. */
    atMilliseconds: number;
    holdMilliseconds: number;
    /** Attachment name of the screenshot taken at the end of the hold. */
    screenshotLabel: string;
}

/** A visual check of the run, with the copied media files it refers to. */
export interface SlideshowVisualCheck {
    segment: number;
    title: string;
    browser: string;
    label: string;
    shows: string;
    video?: string;
    screenshot?: string;
    atSeconds: number;
    holdSeconds: number;
}
