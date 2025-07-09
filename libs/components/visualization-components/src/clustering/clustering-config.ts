export class ClusteringConfig {
    colors: string[];
    lineChartColor: string;
    radarClusterOpacity: number;
    features: string[];
    featureTooltips: string[];
    radialScaleDomain: number[];
    radialScaleRange: number[];
}

export const VIS_CONFIG: ClusteringConfig = {
    colors: [
        '#FFB300',
        '#803E75',
        '#FF6800',
        '#A6BDD7',
        '#C10020',
        '#CEA262',
        '#817066',
        '#007D34',
        '#F6768E',
        '#00538A',
        '#FF7A5C',
        '#53377A',
        '#FF8E00',
        '#B32851',
        '#F4C800',
        '#7F180D',
        '#93AA00',
        '#593315',
        '#F13A13',
        '#232C16',
    ],
    lineChartColor: '#3f51b5',
    radarClusterOpacity: 0.5,
    features: ['Maximum time after hint', 'Wrong flags', 'Score total', 'Time played', 'Hints taken'],
    featureTooltips: [
        'How long does it take the players to solve level <br/> after the last used hint',
        'Wrong flags submitted during the game',
        'The final game score of finished players',
        'Total time played',
        'Hints taken across the whole game',
    ],
    radialScaleDomain: [-1, 4],
    radialScaleRange: [0, 65],
};
