export type JavaOffsetPaginationDTO = {
    /**
     * Page number.
     */
    number?: number,
    /**
     * Total number of pages.
     */
    total_pages?: number
    /**
     * Number of elements in page.
     */
    number_of_elements?: number,
    /**
     * Page size.
     */
    size?: number,
    /**
     * Total number of elements in this resource (in all Pages).
     */
    total_elements?: number,
}

export type DjangoOffsetPaginationDTO = {
    page?: number,
    page_size?: number,
    page_count?: number,
    count?: number,
    total_count?: number,
}

export type DjangoResourceDTO<T> = DjangoOffsetPaginationDTO & {
    results?: T;
}


