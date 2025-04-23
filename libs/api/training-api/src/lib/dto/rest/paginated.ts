export interface Paginated {
    /**
     * Page number.
     */
    number?: number;
    /**
     * Number of elements in page.
     */
    number_of_elements?: number;
    /**
     * Page size.
     */
    size?: number;
    /**
     * Total number of elements in this resource (in all Pages).
     */
    total_elements?: number;
    /**
     * Total number of pages.
     */
    total_pages?: number;
}
