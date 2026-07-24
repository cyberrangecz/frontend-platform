import { Observable, of } from 'rxjs';
import { avatarDataUrl } from './avatar-identity';

/**
 * Loads a trainee's base64 avatar into a square, circularly-clipped image encoded as a PNG data
 * URL, sized for use as an ECharts point marker via `symbol: 'image://' + url`. The clip makes the
 * avatar round regardless of the source aspect ratio, and an image symbol (unlike an image color
 * pattern) is scaled and centered onto the marker. Emits null — without touching the DOM — when no
 * picture is supplied, and null on a decode failure, so callers can fall back to a plain marker.
 *
 * @param base64Picture Raw base64 PNG body without a data-URL prefix; blank when the trainee has none.
 * @param diameter      Rendered marker diameter in pixels; the image is drawn at this size.
 * @returns An observable emitting a `data:image/png;base64,…` URL once decoded, or null when unavailable; completes after one emission.
 */
export function loadCircularAvatarImageUrl(
    base64Picture: string,
    diameter: number,
): Observable<string | null> {
    const dataUrl = avatarDataUrl(base64Picture);
    if (!dataUrl) return of(null);
    return new Observable<string | null>((subscriber) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = diameter;
            canvas.height = diameter;
            const context = canvas.getContext('2d');
            if (!context) {
                subscriber.next(null);
                subscriber.complete();
                return;
            }
            const radius = diameter / 2;
            context.beginPath();
            context.arc(radius, radius, radius, 0, Math.PI * 2);
            context.closePath();
            context.clip();
            context.drawImage(image, 0, 0, diameter, diameter);
            subscriber.next(canvas.toDataURL());
            subscriber.complete();
        };
        image.onerror = () => {
            subscriber.next(null);
            subscriber.complete();
        };
        image.src = dataUrl;
    });
}
