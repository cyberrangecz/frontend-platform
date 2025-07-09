/**
 * Represents the checkboxes of the Filter component
 * The first element defines the given training instance,
 * while the second element marks whether the corresponding
 * checkbox is checked or not
 * The third element is not compulsory, defines whether the
 * given checkbox should be disabled or not
 */
export interface IStatisticsFilter {
    training: string;
    checked: boolean;
    disabled?: boolean;
    instanceId: number;
}
