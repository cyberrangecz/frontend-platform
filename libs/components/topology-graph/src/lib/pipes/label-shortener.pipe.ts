import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'labelShortener' })
export class LabelShortenerPipe implements PipeTransform {
    readonly MAX_LENGTH = 18;

    transform(value: string, ...args: any[]): string {
        if (value.length > this.MAX_LENGTH) {
            return value.substring(0, this.MAX_LENGTH - 3).concat('...');
        } else {
            return value;
        }
    }
}
