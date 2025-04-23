export interface DjangoResourceDTO<T> {
    page?: number;
    page_size?: number;
    page_count?: number;
    count?: number;
    total_count?: number;
    results?: T[];
}
