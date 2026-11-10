import { AttachmentMetadata } from '../attachment/attachment-source';

/** How far past the media's own pixel width a card may be dragged, as a multiple of that width. */
export const MAXIMUM_SCALE = 2;

/** Clear space kept around the download button of an image card. */
export const DOWNLOAD_BUTTON_MARGIN_PIXELS = 16;

/** Narrowest width, in CSS px, at which a video card's playback bar shows its fixed controls without clipping. */
export const VIDEO_MINIMUM_WIDTH_PIXELS = 352;

/** The widths a media card may be shown at, in whole CSS px; `maximum` is infinite when the media has no known width, and `minimum` never exceeds it. */
export interface MediaSizeLimits {
    readonly minimum: number;
    readonly maximum: number;
}

/** The pixel size a media file was stored with; a dimension is missing when it is unknown. */
export type MediaDimensions = Pick<AttachmentMetadata, 'width' | 'height'>;

/** A measured box, in CSS px. */
export interface MeasuredSize {
    readonly width: number;
    readonly height: number;
}

/** Whether both pixel dimensions of a media file are stored. */
export function hasKnownDimensions(dimensions: MediaDimensions): dimensions is Required<MediaDimensions> {
    return !!dimensions.width && !!dimensions.height;
}

/** The CSS aspect ratio of a media file, or null when its dimensions are not both stored. */
export function aspectRatioOf(dimensions: MediaDimensions): string | null {
    return hasKnownDimensions(dimensions) ? `${dimensions.width} / ${dimensions.height}` : null;
}

/** How tall a media file is per unit of its width; 0 when its dimensions are not both stored. */
export function heightPerWidthOf(dimensions: MediaDimensions): number {
    return hasKnownDimensions(dimensions) ? dimensions.height / dimensions.width : 0;
}

/** The limits rounded inwards to whole px; the maximum never falls below the minimum, and an open maximum stays open. */
function wholePixelLimits({ minimum, maximum }: MediaSizeLimits): MediaSizeLimits {
    const narrowest = Math.ceil(minimum);
    return { minimum: narrowest, maximum: Math.max(narrowest, Math.floor(maximum)) };
}

/** The limits for a minimum; the maximum is twice the media's own width, widened to the minimum, and unbounded when that width is unknown. */
function limitsFrom(minimum: number, { width }: MediaDimensions): MediaSizeLimits {
    const maximum = width ? Math.max(MAXIMUM_SCALE * width, minimum) : Number.POSITIVE_INFINITY;
    return wholePixelLimits({ minimum, maximum });
}

/**
 * The widths an image or GIF card may be shown at. The minimum leaves the download button its
 * margin on every side at the picture's aspect ratio; a picture smaller than that keeps its own
 * width as the minimum.
 */
export function imageSizeLimits(dimensions: MediaDimensions, downloadButton: MeasuredSize): MediaSizeLimits {
    const widthForButton = downloadButton.width + 2 * DOWNLOAD_BUTTON_MARGIN_PIXELS;
    const heightForButton = downloadButton.height + 2 * DOWNLOAD_BUTTON_MARGIN_PIXELS;
    const widthForHeight = hasKnownDimensions(dimensions) ? (heightForButton * dimensions.width) / dimensions.height : 0;
    const needed = Math.max(widthForButton, widthForHeight);
    return limitsFrom(dimensions.width ? Math.min(needed, dimensions.width) : needed, dimensions);
}

/** The widths a video card may be shown at; the minimum applies however small the uploaded video is. */
export function videoSizeLimits(dimensions: MediaDimensions): MediaSizeLimits {
    return limitsFrom(VIDEO_MINIMUM_WIDTH_PIXELS, dimensions);
}

/**
 * A width brought into the limits, in whole CSS px. A width that is no number, or infinite under
 * an open maximum, becomes the minimum.
 */
export function clampWidth(width: number, { minimum, maximum }: MediaSizeLimits): number {
    const clamped = Math.max(minimum, Math.min(maximum, Math.round(width)));
    return Number.isFinite(clamped) ? clamped : minimum;
}

/** The width a typed value saves: none for a blank value, else the value brought into the limits. */
export function typedWidthOf(text: string, limits: MediaSizeLimits): number | undefined {
    return text.trim() ? clampWidth(Number(text), limits) : undefined;
}

/**
 * The limits with the maximum held to a column's width, never below the minimum, which a column
 * narrower than it cannot take away. A column of unknown width leaves the limits as they are.
 */
export function capToColumn(limits: MediaSizeLimits, columnWidth: number | null): MediaSizeLimits {
    if (!columnWidth) {
        return limits;
    }
    return wholePixelLimits({ minimum: limits.minimum, maximum: Math.min(limits.maximum, columnWidth) });
}

/**
 * The width a media card is shown at: the saved width, else the stored one when both stored
 * dimensions are known, brought into the limits once they are known; null when neither applies.
 */
export function shownWidthOf(savedWidth: number | undefined, dimensions: MediaDimensions, limits: MediaSizeLimits | null): number | null {
    const width = savedWidth ?? (hasKnownDimensions(dimensions) ? dimensions.width : undefined);
    if (!width) {
        return null;
    }
    return limits ? clampWidth(width, limits) : width;
}
