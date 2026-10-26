function deepCopy<T>(obj: T): T {
    // Handle the 3 simple types, and null or undefined
    if (null == obj || 'object' != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        const copy = new Date();
        copy.setTime(obj.getTime());
        return copy as T;
    }

    // Handle Array
    if (obj instanceof Array) {
        const copy: unknown[] = [];
        for (let i = 0, len = obj.length; i < len; i++) {
            copy[i] = deepCopy(obj[i]);
        }
        return copy as T;
    }

    // Handle Object
    if (obj instanceof Object) {
        const copy: Record<string, unknown> = {};
        for (const attr in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, attr))
                copy[attr] = deepCopy(obj[attr]);
        }
        return copy as T;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

export const ObjectUtils = {
    deepCopy,
};
