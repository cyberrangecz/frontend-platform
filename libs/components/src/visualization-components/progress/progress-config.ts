import {DisplayView, ViewEnum} from './components/types';


export class ProgressConfig {
    levelsTimePlan: number[];
    levelsColorEstimates: string[];
    traineeRowHeight: number;
    defaultEstimatedTime: number;
    trainingColors: string[];
    traineeColors: string[];
    darkColor: string;
    eventProps: {
        eventIconSize: number;
        groupIconSize: number;
        eventShapes: object;
    };
    shapes: object;
    finalViewBarPadding: number;
    zoomStep: number;
    simulationInterval: number;
    loadDataInterval: number;
    retryAttempts: number;
    defaultView: ViewEnum;
    viewOptions: DisplayView[];
    filterOptions: DisplayView[];
    wrongAnswerWarningThreshold: number;
    // config values for old version:
    assetsRoot: string;
    maxZoomValue: number;
    minBarHeight: number;
    maxBarHeight: number;
}

export const PROGRESS_CONFIG: ProgressConfig = {
    levelsTimePlan: [],
    levelsColorEstimates: ['#5A9239', '#FDB100', '#EB1505'],
    defaultEstimatedTime: 5,
    traineeRowHeight: 30,
    trainingColors: ['#ebebeb', '#dadada', '#c0c0c0', '#aeaeae', '#9b9b9b', '#646464', '#3e3e3c'],
    traineeColors: ['#D8008C', '#92D88C', '#372A9F', '#9035A6', '#D88C8C', '#7A9EBD', '#D8D88C', '#ADAAE1', '#8CD8C7'],
    darkColor: '#2f2f2f',
    eventProps: {
        eventIconSize: 17,
        groupIconSize: 18,
        eventShapes: {
            hint: 'M15,7.9c0,3.9-3.1,7-7,7c-3.9,0-7-3.1-7-7c0-3.9,3.1-7,7-7C11.9,0.9,15,4,15,7.9z',
            skip: 'M3.4,0.9L8,5.5l4.7-4.6l2.3,2.2L10.4,8l4.7,4.7L12.9,15L8,10.2l-4.8,4.9l-2.4-2.3L5.6,8L0.9,3.5L3.4,0.9z',
            solution: 'M0.7,10.2l2-3L6,9.5l6.5-8.1l2.9,2.3L6.6,14.6L0.7,10.2z',
            group: 'M17.5,9c0,4.7-3.8,8.5-8.5,8.5c-4.7,0-8.5-3.8-8.5-8.5c0-4.7,3.8-8.5,8.5-8.5C13.7,0.5,17.5,4.3,17.5,9z',
            wrong:
                'm13.442553,8.807937l3.19308,-5.361621c0.063743,-0.107093 0.067045,-0.241568 0.008917,-0.351781c-0.058458,-0.110213 ' +
                '-0.16877,-0.178487 -0.288989,-0.178487l-14.862288,0l0,-0.693166c0,' +
                '-0.191658 -0.147632,-0.346581 -0.330273,-0.346581s-0.330273,' +
                '0.154923 -0.330273,0.346581l0,1.039747l0,10.050869l-0.030897,' +
                '1.112352c-0.08162,0.722663 0.31874,0.474471 0.719104,0.468987l14.834628,' +
                '-0.195011c0.002642,0.000349 0.005284,0 0.006605,0c0.182641,0 0.330273,-0.154923 0.330273,-0.346581l-3.249887,-5.545308z',
        },
    },
    shapes: {
        view:
            'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,' +
            '5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z',
        filter:
            'M14,12V19.88C14.04,20.18 13.94,20.5 13.71,20.71C13.32,21.1 12.69,21.1 12.3,20.71L10.29,18.7C10.06,18.47 9.96,18.16 10,' +
            '17.87V12H9.97L4.21,4.62C3.87,4.19 3.95,3.56 4.38,3.22C4.57,3.08 4.78,3 5,3V3H19V3C19.22,3 19.43,3.08 19.62,3.22C20.05,' +
            '3.56 20.13,4.19 19.79,4.62L14.03,12H14Z',
        person:
            'm10.229133,10.933364c2.38147,0 4.312174,-2.405942 4.312174,-5.373695c0,-2.967753 -1.930703,-5.373558 -4.312174,' +
            '-5.373558s-4.312041,2.405942 -4.312041,5.373695c0,2.967753 1.930571,5.373558 4.312041,5.373558m0,0c-4.923313,0 -8.95278,' +
            '3.415858 -9.298576,7.744112l18.597151,0c-0.345796,-4.328116 -4.37513,-7.744112 -9.298576,-7.744112',
        zoom:
            'M9,2A7,7 0 0,1 16,9C16,10.57 15.5,12 14.61,13.19L15.41,14H16L22,20L20,22L14,16V15.41L13.19,14.61C12,15.5 10.57,16 9,' +
            '16A7,7 0 0,1 2,9A7,7 0 0,1 9,2M8,5V8H5V10H8V13H10V10H13V8H10V5H8Z',
        compare: 'M0 26 L26 26 L26 0 L0 0 Z',
        remove: 'M19,3 H5C3.9,3 3,3.9 3,5v14c0,1.1 0.9,2 2,2h14c1.1,0 2,-0.9 2,-2V5C21,3.9 20.1,3 19,3ZM17,13H7v-2h10z',
    },
    finalViewBarPadding: 50,
    zoomStep: 0.25,
    simulationInterval: 800,
    loadDataInterval: 5000,
    retryAttempts: 3,
    defaultView: ViewEnum.Overview,
    viewOptions: [
        {
            id: 1,
            name: 'Progress',
        },
        {
            id: 2,
            name: 'Final overview',
        },
    ],
    filterOptions: [
        {
            id: 1,
            name: 'All',
        },
        {
            id: 2,
            name: 'Training finished',
        },
        {
            id: 3,
            name: 'Training not finished',
        },
    ],
    wrongAnswerWarningThreshold: 5,
    assetsRoot: '/portlet_ctf_progress-0.1/',
    maxZoomValue: 10,
    minBarHeight: 18,
    maxBarHeight: 35,
};
