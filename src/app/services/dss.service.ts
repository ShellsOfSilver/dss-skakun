import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import * as L from 'leaflet';

import { BehaviorSubject, Observable } from 'rxjs';

import { POINTS, D, CENTER, N_PROGRAMS, PATHS } from '../data';

export interface DSSData {
    init: boolean;
    D: number;
    POINTS: Array<{ key: number, x: number, y: number }>;
    CENTER: { key: number, x: number, y: number };
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

export type VIEW_MODE = 'paths' | 'saving';

@Injectable({
    providedIn: 'root',
})
export class DSSService {

    private Dm = D;
    private dssData: BehaviorSubject<DSSData>;
    isEuclide = false;

    constructor(
        private http: HttpClient
    ) {
        this.dssData = new BehaviorSubject({
            init: false,
            D: this.Dm,
            POINTS,
            CENTER,
            N_PROGRAMS,
            NQ: [0],
            F: [0],
            X: [0],
            Xnorm: [0],
            XSum: 0,
            Qmax: 0,
            Qij: [{}],
            viewMode: 'paths',
            tables: {
                NQ_F: {
                    columns: [''],
                    data: [{}]
                },
                Q: {
                    columns: [''],
                    data: [{}]
                },
                Other: {
                    columns: [''],
                    data: [{}]
                },
                Distance: {
                    columns: [''],
                    data: [{}]
                },
                SavingTable: {
                    columns: [''],
                    data: [{}]
                },
                SavingPath: {
                    columns: [''],
                    data: [{}]
                },
            }
        } as DSSData);

        this.prepareData();
    }

    private getX() {
        let XSum = 0;

        const X: Array<number> = [];
        const Xnorm: Array<number> = [];

        for (let i = 0; i < POINTS.length; i++) {
            const value = Math.random();

            X.push(value);
            XSum += value;
        }

        for (let i = 0; i < POINTS.length; i++) {
            Xnorm.push(X[i] / XSum);
        }

        return { XSum: +XSum.toFixed(4), X, Xnorm };
    }

    private getNQ() {
        const nq: Array<number> = [];

        for (let i = 0; i < N_PROGRAMS; i++) {
            nq.push(+Math.random().toFixed(4));
        }

        return nq;
    }

    private getQij(X: Array<number>, Xnorm: Array<number>) {
        const Qij: Array<{ [key: string]: number }> = [];
        let Qmax = 0;

        for (let i = 0; i < Xnorm.length; i++) {
            const row: { [key: string]: number } = { i };

            for (let j = 0; j < X.length; j++) {
                const value = Math.max(X[j] * Xnorm[i], 0);
                row['F' + (j + 1)] = +value.toFixed(4);

                if (value > Qmax) {
                    Qmax = +value.toFixed(4);
                }
            }

            Qij.push(row);
        }

        return { Qij, Qmax };
    }

    private getFs(nq: Array<number>) {
        const F: Array<number> = [];

        for (let i = 0; i < nq.length; i++) {
            if (i === 0) {
                F.push(+(3 * nq[i] * (1 + this.Dm)).toFixed(4));
            } else {
                F.push(+(F[i - 1] * (1 + nq[i])).toFixed(4));
            }
        }

        return F;
    }

    private getDistance2Point() {
        const points = [CENTER, ...POINTS];
        const data = [];
        const columns: Array<string> = ['N'];

        for (let i = 0; i < points.length; i++) {
            columns.push(`${points[i].key}`);
            const row = { N: points[i].key } as any;
            for (let j = 0; j < points.length; j++) {
                if (this.isEuclide) {
                    row[points[j].key] = +Math.sqrt(Math.pow((points[i].x - points[j].x), 2) + Math.pow((points[i].y - points[j].y), 2)).toFixed(4);
                } else {
                    const el = Object.values(PATHS).find(e => e.point === `№${points[i].key} [${points[i].x}, ${points[i].y}] - №${points[j].key} [${points[j].x}, ${points[j].y}]`);
                    row[points[j].key] = el?.distance;
                }
            }
            data.push(row);
        }

        return { data, columns };
    }

    private calcSavingTable(distance: Array<any>) {
        const data: Array<any> = [];
        const columns: Array<string> = ['N', 'L1', 'L2', 'Distance'];

        const keys = Object.keys(distance[0]).sort();

        for (let i = 0; i < distance.length; i++) {
            for (let j = 0; j < distance.length; j++) {
                if (!(data.find(e => e.L1 === keys[i] && e.L2 === keys[j]) || data.find(e => e.L1 === keys[j] && e.L2 === keys[i]) || keys[j] === keys[i])) {
                    const dis = +(distance[i][keys[0]] + distance[j][keys[0]] - distance[i][keys[j]]).toFixed(4);
                    data.push({
                        L1: keys[j],
                        L2: keys[i],
                        Distance: Math.abs(dis)
                    });
                }
            }
        }

        data.sort((a, b) => a.Distance > b.Distance ? -1 : 1);

        return {
            columns,
            data: data.map((e, inx) => ({ ...e, N: inx + 1 }))
        };
    }

    private calcSavingPath(distance: Array<any>) {
        const savingPath: Array<any> = ['0'];
        const columns: Array<string> = ['Path'];
        let current = distance[0];

        const addVal = (arr: Array<any>) => {
            if (arr.length) {
                arr = arr.filter(e => e.L1 !== current.L1 && e.L2 !== current.L1);

                if (!savingPath.includes(current.L1)) {
                    savingPath.push(current.L1);
                }

                if (!savingPath.includes(current.L2)) {
                    savingPath.push(current.L2);
                }

                const old = JSON.parse(JSON.stringify(current));

                current = arr.find(e => e.L1 === current.L2 || e.L2 === current.L2);

                if (!current) {
                    return;
                }

                if (old.L2 === current.L2) {
                    const tmp = current.L1;
                    current.L1 = current.L2;
                    current.L2 = tmp;
                }

                addVal(arr);
            }
        };

        addVal([...distance]);

        savingPath.push('0');

        return {
            columns,
            data: [{
                Path: savingPath.join('-')
            }]
        };
    }

    setEuclide(status: boolean) {
        this.isEuclide = status;
        setTimeout(() => {
            this.prepareData();
        });
    }

    setMapView(viewMode: VIEW_MODE) {
        this.dssData.next({
            ...this.dssData.value,
            viewMode
        });
    }

    getDssData$(): Observable<DSSData> {
        return this.dssData.asObservable();
    }

    prepareData() {
        const NQ = this.getNQ();
        const F = this.getFs(NQ);
        const { XSum, X, Xnorm } = this.getX();
        const { Qij, Qmax } = this.getQij(F, Xnorm);
        const distance = this.getDistance2Point();
        const savingTable = this.calcSavingTable(distance.data);
        const savingPath = this.calcSavingPath(savingTable.data);

        if (Qmax > this.Dm) {
            console.log('-- Updated D --');
            this.Dm = Qmax + Math.random() * ((Qmax * 0.1) - 0 + 1) + 0;
        }

        const data = {
            init: true,
            POINTS,
            D: this.Dm,
            CENTER,
            N_PROGRAMS,
            NQ,
            F,
            X,
            XSum,
            Xnorm,
            Qij,
            Qmax,
            viewMode: this.dssData.value.viewMode,
            tables: {
                NQ_F: {
                    columns: ['N', 'η', 'F'],
                    data: NQ.map((e, i) => ({
                        N: i + 1,
                        η: e,
                        F: F[i]
                    })),
                },
                Q: {
                    columns: ['N', 'X', 'X_norm', ...F.map((_, i) => 'F' + (i + 1))],
                    data: X.map((e, i) => ({
                        N: i + 1,
                        X: e.toFixed(4),
                        X_norm: Xnorm[i].toFixed(4),
                        ...Qij[i]
                    })),
                },
                Other: {
                    columns: ['D', 'X_sum', 'Q_max'],
                    data: [{ D: D, X_sum: XSum, Q_max: Qmax }],
                },
                Distance: distance,
                SavingTable: savingTable,
                SavingPath: savingPath,
            }
        } as DSSData;

        console.log('data::', data);
        this.dssData.next(data);
    }

    getPath(from: L.LatLng, to: L.LatLng) {
        return this.http.get(
            `http://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full`
        );
    }
}