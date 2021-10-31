export interface DSSData {
    updated?: number;
    currentProgram?: string;
    C_LIST?: Array<number>;
    Q_LIST?: Array<number>;
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
            columns: Array<string>;
            data: Array<any>
        };
        Distance: {
            columns: Array<string>;
            data: Array<any>
        };
        SavingTable: {
            columns: Array<string>;
            data: Array<any>
        };
        SavingPath: {
            columns: Array<string>;
            data: Array<any>
        };
        SavingPrograms: {
            columns: Array<string>;
            data: Array<any>
        };
        Sweeping: {
            columns: Array<string>;
            data: Array<any>
        };
        SweepingPath: {
            columns: Array<string>;
            data: Array<any>
        };
        SweepingPrograms: {
            columns: Array<string>;
            data: Array<any>
        };
        ComparePrograms: {
            columns: Array<string>;
            data: Array<any>
        };
        SolutionMatrix: {
            columns: Array<string>;
            data: Array<any>
        };
    };
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

export type VIEW_MODE = 'paths' | 'saving' | 'saving programs' | 'sweeping' | 'sweeping programs';

export enum PAGE_NAME {
    'Map',
    'Part 1',
    'Part 2',
    'Part 3',
    'Part 4',
    'Part 5',
    'Part 6',
    'Part 7',
};
