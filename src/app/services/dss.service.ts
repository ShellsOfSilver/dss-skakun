import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import * as L from 'leaflet';

import { BehaviorSubject, Observable } from 'rxjs';

import { POINTS, D, CENTER, N_PROGRAMS } from '../data';

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
    },
};

@Injectable({
    providedIn: 'root',
})
export class DSSService {

    private Dm = D;
    private dssData: BehaviorSubject<DSSData>;

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
            }
        } as DSSData);
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

    getDssData$(): Observable<DSSData> {
        return this.dssData.asObservable();
    }

    prepareData() {
        const NQ = this.getNQ();
        const F = this.getFs(NQ);
        const { XSum, X, Xnorm } = this.getX();
        const { Qij, Qmax } = this.getQij(F, Xnorm);

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