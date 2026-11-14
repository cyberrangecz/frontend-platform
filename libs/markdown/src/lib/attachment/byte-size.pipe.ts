import { Pipe, PipeTransform } from '@angular/core';
import { formatBytes } from './attachment-kind';

/** Formats a byte count in IEC units. */
@Pipe({ name: 'crczpByteSize' })
export class ByteSizePipe implements PipeTransform {
    transform(bytes: number): string {
        return formatBytes(bytes);
    }
}
