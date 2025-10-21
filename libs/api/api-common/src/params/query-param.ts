type ParamValue = string | number | boolean;

export class QueryParam {
    constructor(
        public name: string,
        public value: ParamValue,
    ) {}
    static fromObject(obj: Record<string, ParamValue>): QueryParam[] {
        return Object.entries(obj).map(
            ([name, value]) => new QueryParam(name, value),
        );
    }
}
