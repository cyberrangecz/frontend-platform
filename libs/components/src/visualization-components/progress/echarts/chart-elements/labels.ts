import {
    CombinedProgressChartData,
    IndexedTrainee,
} from '../chart-utility-types';

/**
 * Internal type: Map from trainee index to trainee data + favorite status.
 * Used for fast lookup when formatting Y-axis labels.
 */
type IndexMap = Map<number, IndexedTrainee>;

/**
 * Base styles for rich text elements in Y-axis labels.
 *
 * ECharts rich text syntax: {styleName|content}
 * Styles applied per trainee index for avatars.
 *
 * Layout: pin (right) → name (right-aligned) → avatar (circle)
 *
 * Why rich text? Allows mixed fonts (Material Icons), images (avatars), colors in one label.
 */
const LABEL_STYLES = {
    /**
     * Default name style (right-aligned, padded from avatar)
     */
    name: {
        fontSize: 12,
        padding: [0, 4, 0, 0], // top right bottom left
        align: 'right' as const,
        verticalAlign: 'middle' as const,
    },
    /**
     * Favorite pin icon (gold Material Icon)
     */
    pin: {
        fontFamily: 'Material Icons',
        fontSize: 14,
        color: '#B8860B', // Gold color for favorites
        padding: [0, 2, 0, 0],
        align: 'right' as const,
        verticalAlign: 'middle' as const,
    },
    /**
     * Avatar style (circular image)
     */
    avatar: {
        height: 24,
        width: 24,
        borderRadius: 12, // Half of 24 = perfect circle
        verticalAlign: 'middle' as const,
    },
};

/**
 * Builds Y-axis rich text labels with avatars, names, and favorite indicators.
 * Creates per-trainee styling and formatter functions for ECharts axis labels.
 */
export class LabelBuilder {
    /**
     * ECharts rich text styles object.
     * Contains base styles + per-trainee avatar/name styles.
     * null until constructor runs.
     */
    public richTextStyles: Record<string, unknown> | null = null;

    /**
     * Formatter function for axis labels.
     * Input: category index (0,1,2...)
     * Output: Rich text template string
     * null until constructor runs.
     */
    public formatter: ((value: string | number) => string) | null = null;

    /**
     * Fast lookup: trainee index → trainee data + isFavorited
     * Built once per chart update.
     */
    private readonly traineeMap: IndexMap | null = null;

    /**
     * Constructor builds all label data structures.
     * Called once per chart update in Axis.buildYAxis().
     *
     * @param data - Combined chart data
     */
    constructor(data: CombinedProgressChartData) {
        this.traineeMap = this.buildTraineeIndexMap(data);
        this.richTextStyles = this.createRichTextStyles(this.traineeMap);
        this.formatter = this.createTraineeLabelFormatter(this.traineeMap);
    }

    /**
     * Creates lookup map from trainee index to trainee data with favorite status.
     * @param data - Combined chart data containing trainee information
     * @returns Map of trainee indices to indexed trainee objects
     */
    private buildTraineeIndexMap(
        data: CombinedProgressChartData,
    ): Map<number, IndexedTrainee> {
        const map = new Map<number, IndexedTrainee>();
        data.progress.forEach((trainee, index) => {
            map.set(index, {
                ...trainee,
                isFavorited: data.favoritedTrainees.has(trainee.id),
            });
        });
        return map;
    }

    /**
     * Generates ECharts rich text styles object for all trainees.
     * Includes base styles plus per-trainee avatar and name styles.
     * @param traineeIndexMap - Lookup map of trainee indices to data
     * @returns Complete rich text styles object for axis labels
     */
    private createRichTextStyles(
        traineeIndexMap: IndexMap,
    ): Record<string, unknown> {
        const styles: Record<string, unknown> = {
            name: { ...LABEL_STYLES.name },
            pin: { ...LABEL_STYLES.pin },
        };

        traineeIndexMap.forEach((trainee, index) => {
            // Avatar style with trainee picture or default
            // Prepend data URL prefix if missing (trainee.picture is raw base64)
            const avatarImage =
                trainee.picture && !trainee.picture.startsWith('data:')
                    ? `data:image/png;base64,${trainee.picture}`
                    : trainee.picture;

            styles[`avatar${index}`] = {
                ...LABEL_STYLES.avatar,
                backgroundColor: {
                    image: avatarImage,
                },
            };

            // Favorited trainees get bold gold name style
            if (trainee.isFavorited) {
                styles[`name${index}`] = {
                    fontSize: 12,
                    padding: [0, 4, 0, 0],
                    align: 'right',
                    verticalAlign: 'middle',
                    fontWeight: 'bold',
                    color: '#B8860B', // Gold
                };
            }
        });

        return styles;
    }

    /**
     * Creates formatter function for generating rich text labels.
     * Returns different templates for favorited vs normal trainees.
     * @param traineeIndexMap - Lookup map for trainee data access
     * @returns Formatter function for ECharts axis labels
     */
    private createTraineeLabelFormatter(
        traineeIndexMap: IndexMap,
    ): (value: string | number) => string {
        return (value: string | number) => {
            const index =
                typeof value === 'string' ? parseInt(value, 10) : value;
            const trainee = traineeIndexMap.get(index);
            if (!trainee) return '';

            if (trainee.isFavorited) {
                // Gold pin + bold gold name + avatar
                return `{pin|\uf10d}{name${index}|${trainee.name}}{avatar${index}|}`;
            }
            // Normal name + avatar
            return `{name|${trainee.name}}{avatar${index}|}`;
        };
    }
}
