import { Options } from 'vis-network';

const svg_config = {
    CARD: {
        MIN_WIDTH: 150,
        MAX_WIDTH: 320,
        RADIUS: 20,
        PADDING: {
            HEADER: 2,
            BOTTOM: 8,
            LABEL_SIDE: 20,
            LABEL_TOP: 10,
            LABEL_ROW: 10,
        },
    },

    ICON_SIZE: {
        WINDOWS: 20,
        LINUX: 24,
        CONSOLE: 24,
        MAIN: 64,
        INTERNET: 192,
    },

    FONT: {
        SIZE: 18,
        FAMILY: "'Inter', sans-serif",
        PRIMARY_COLOR: '#1c1e2a',
        SECONDARY_COLOR: '#353549',
    },

    SUBNET: {
        MIN_RADIUS: 80,
        COLORS: [
            '#35d7ff',
            '#ff3f3f',
            '#8742f6',
            '#669851',
            '#a0143e',
            '#FF8C00',
            '#0074d9',
            '#fc2ec5',
            '#4AD800',
            '#e4cc44',
            '#1e5913',
            '#132759',
        ],
    },

    COLORS: {
        PRIMARY: {
            MAIN: '#4299E1',
            BG: '#EDF2F7',
            TEXT: '#2D3748',
            BORDER: '#CBD5E0',
        },
        SECONDARY: {
            MAIN: '#48BB78',
            BG: '#F0FFF4',
            TEXT: '#2F855A',
            BORDER: '#9AE6B4',
        },
    },

    INDICATOR: {
        SIZE: 24,
        BACKDROP_SIZE: 32,
        MARGIN: 24,
        BACKDROP_RADIUS: 12,
        BACKDROP_FILL: {
            CONSOLE: '#F0FFF4',
            LINUX: '#fff4d1',
            WINDOWS: '#d8f8f5',
        },
        BACKDROP_STROKE: {
            CONSOLE: '#9AE6B4',
            LINUX: '#fffa94',
            WINDOWS: '#43c7f9',
        },
    },
};

const graph_config: Options = {
    edges: {
        color: '#002776',
        smooth: {
            enabled: true,
            type: 'continuous',
            roundness: 0.2,
        },
        width: 4,
        selectionWidth: 6,
    },

    physics: {
        minVelocity: 0.5,
        barnesHut: {
            centralGravity: 0.3,
            gravitationalConstant: -9000,
            springConstant: 0.25,
            springLength: 300,
            damping: 0.95,
            avoidOverlap: 0.95,
        },
        stabilization: {
            iterations: 1000,
        },
        solver: 'barnesHut',
    },
    interaction: {
        hover: true,
    },
    layout: {
        improvedLayout: true,
        clusterThreshold: 150,
    },
};

export const TOPOLOGY_CONFIG = {
    SVG: svg_config,
    GRAPH: graph_config,
};
