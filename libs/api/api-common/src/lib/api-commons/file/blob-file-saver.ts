import { saveAs } from 'file-saver';

export class BlobFileSaver {
    static saveBlob(blobParts: Blob, filename: string): void {
        const blob = new Blob([blobParts], { type: 'type' });
        saveAs(blob, filename);
    }
}
