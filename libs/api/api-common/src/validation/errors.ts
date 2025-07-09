
export class UnknownEnumValueError extends TypeError {
    constructor(value: string, enumType: string) {
        super(`Unknown value "${value}" for enum "${enumType}"`);
        this.name = 'UnknownEnumValueError';
    }
}
