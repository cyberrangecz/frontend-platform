import { saveAs } from 'file-saver';

export class FileSaver {
    static fromBlob(blobParts: Blob, filename: string): void {
        const blob = new Blob([blobParts], { type: 'type' });
        saveAs(blob, filename);
    }
}
