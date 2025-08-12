import { GraphNodeType } from './topology-vis-types';

type PerNodeTypeValue<T> = { [key in GraphNodeType]: T };

export const TOPOLOGY_CONFIG = {
    PHYSICS: {
        MASS: {
            INTERNET: 30,
            ROUTER: 5,
            HOST: 10,
            SUBNET: 50,
        } satisfies PerNodeTypeValue<number>,
        SIZE: {
            INTERNET: 120,
            ROUTER: 110,
            HOST: 100,
            SUBNET: 120,
        } satisfies PerNodeTypeValue<number>,
    },
    NODE_VISUALIZATION: {
        ICON_PATHS: {
            LINUX: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linux/linux-original.svg',
            WINDOWS:
                'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows11/windows11-original.svg',
            CONSOLE: '/assets/topology-graph/console.svg',
            ROUTER: '/assets/topology-graph/router.svg',
            HOST: '/assets/topology-graph/host.svg',
            INTERNET: '/assets/topology-graph/internet.svg',
        },
        // Dimensions
        NODE_MIN_WIDTH: 150,
        NODE_MAX_WIDTH: 320,
        // NODE_MAIN_CARD_HEIGHT is now calculated dynamically
        MAIN_CARD_BOTTOM_PADDING: 8, // Padding below the label inside the card
        CARD_RX: 20,

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

        // Positioning
        HEADER_PADDING: 2,
        ICON_SIZE: 64,
        LABEL_TOP_MARGIN: 10,
        LABEL_SIDE_PADDING: 20,

        // Fonts
        LABEL_FONT_SIZE: 18,
        LABEL_FONT_FAMILY:
            "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",

        // Colors & Styles
        ACCENT_COLOR: '#4299e1',
        COLORS: {
            primary: {
                main: '#4299e1',
                bg: '#EDF2F7',
                text: '#2D3748',
                border: '#CBD5E0',
            },
            secondary: {
                main: '#48bb78',
                bg: '#F0FFF4',
                text: '#2F855A',
                border: '#9AE6B4',
            },
        },
    },
};
