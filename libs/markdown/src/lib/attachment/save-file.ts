/** Hands the file at an object URL to the browser's download under the given name. */
export function saveFile(url: string, fileName: string): void {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
}
