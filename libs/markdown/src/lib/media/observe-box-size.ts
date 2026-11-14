import { MeasuredSize } from './media-size-limits';

/**
 * Reports an element's size each time its layout box changes to a non-empty one; a box that is
 * empty, such as one inside a closed section, reports nothing until it gets a size.
 * Returns the function that stops the observation.
 */
export function observeBoxSize(element: HTMLElement, report: (size: MeasuredSize) => void): () => void {
    const observer = new ResizeObserver(() => {
        const { offsetWidth, offsetHeight } = element;
        if (offsetWidth && offsetHeight) {
            report({ width: offsetWidth, height: offsetHeight });
        }
    });
    observer.observe(element);
    return () => observer.disconnect();
}

/**
 * Reports the width of the column an element fills, excluding any scrollbar the column or the
 * element itself draws, each time that width changes to a non-zero one. The element's parent is
 * observed as well, so a scrollbar appearing on the column is noticed.
 * Returns the function that stops the observation.
 */
export function observeColumnWidth(element: HTMLElement, report: (width: number) => void): () => void {
    const observer = new ResizeObserver(() => {
        if (element.clientWidth) {
            report(element.clientWidth);
        }
    });
    observer.observe(element);
    if (element.parentElement) {
        observer.observe(element.parentElement);
    }
    return () => observer.disconnect();
}
