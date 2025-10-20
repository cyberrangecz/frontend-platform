import { JavaOffsetPaginationDTO } from '../pagination/pagination-types';

type WithPresentFields<T, K extends keyof T> = {
    [P in K]-?: NonNullable<T[P]>;
} & Omit<T, K>;

export class PresenceValidator {
    /**
     * Checks all fields and throws an error if any of them is null or undefined.
     * Maps the object to a new object with all required fields with null or undefined values removed.
     * @param object
     * @param requiredFields array of keys of the object to check
     */
    public static hasAllRequiredFields<T, const F extends readonly (keyof T)[]>(
        object: T,
        requiredFields: F,
    ): WithPresentFields<T, F[number]> {
        if (!object) {
            throw new ReferenceError('Object is null or undefined');
        }

        for (const field of requiredFields) {
            if (object[field] === undefined || object[field] === null) {
                throw new ReferenceError(
                    `Required field ${String(field)} is null or undefined`,
                );
            }
        }

        return object as WithPresentFields<T, F[number]>;
    }

    public static validateHttpResponseBody<T extends { body?: B }, B>(
        response: T,
    ) {
        return this.hasAllRequiredFields(response, ['body']);
    }

    public static validateOffsetPaginatedResource<
        C,
        T extends { content?: C[]; pagination?: JavaOffsetPaginationDTO },
    >(
        resource: T,
    ): {
        content: C[];
        pagination: WithPresentFields<
            JavaOffsetPaginationDTO,
            | 'number'
            | 'total_pages'
            | 'number_of_elements'
            | 'size'
            | 'total_elements'
        >;
    } {
        return this.hasAllRequiredFields(
            {
                ...resource,
                pagination: this.hasAllRequiredFields(resource.pagination, [
                    'number',
                    'total_pages',
                    'number_of_elements',
                    'size',
                    'total_elements',
                ]),
            },
            ['pagination', 'content'],
        );
    }
}
