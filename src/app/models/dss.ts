export interface DSSData {
    updated?: number,
    ID?: string;
    init: boolean;
    D: number;
    POINTS: Array<Point>;
    PATHS: Array<Path>;
    NAME: string;
    CENTER: Point;
    N_PROGRAMS: number;
    NQ: Array<number>;
    F: Array<number>;
    X: Array<number>;
    Xnorm: Array<number>;
    XSum: number;
    Qmax: number;
    Qij: Array<{ [key: string]: number }>;
    viewMode: VIEW_MODE;
    tables: {
        NQ_F: {
            columns: Array<string>,
            data: Array<any>
        },
        Q: {
            columns: Array<string>,
            data: Array<any>
        },
        Other: {
            columns: Array<string>,
            data: Array<any>
        },
        Distance: {
            columns: Array<string>,
            data: Array<any>
        },
        SavingTable: {
            columns: Array<string>,
            data: Array<any>
        },
        SavingPath: {
            columns: Array<string>,
            data: Array<any>
        },
    },
};

export interface Point {
    x: number;
    y: number;
    key: number;
};

export interface Path {
    ID?: string;
    distance: number;
    geometry: string;
    points: Array<number>;
};

export type VIEW_MODE = 'paths' | 'saving';

export enum PAGE_NAME {
    'Map',
    'Part 1',
    'Part 2',
};
