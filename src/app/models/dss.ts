export interface DSSData {
    updated?: number,
    currentProgram?: string,
    ID?: string;
    init: boolean;
    D: number;
    POINTS: Array<Point>;
    PATHS: Array<Path>;
    NAME: string;
    CENTER: Point;
    N_PROGRAMS: number;
    Qij: Array<{ [key: string]: number }>;
    viewMode: VIEW_MODE;
    tables: {
        Q: {
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
        SavingPrograms: {
            columns: Array<string>,
            data: Array<any>
        },
    },
};

export interface Point {
    x: number;
    y: number;
    key: number;
    programs?: Array<number>
};

export interface Path {
    ID?: string;
    distance: number;
    geometry: string;
    points: Array<number>;
};

export type VIEW_MODE = 'paths' | 'saving' | 'programs';

export enum PAGE_NAME {
    'Map',
    'Part 1',
    'Part 2',
    'Part 3',
};
