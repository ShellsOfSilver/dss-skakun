import { AngularFirestore } from '@angular/fire/firestore';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { DSSData, PAGE_NAME, Path, Point, VIEW_MODE } from '../models/dss';
import { TEST_DOC } from '../data';

@Injectable({
    providedIn: 'root',
})
export class DSSService {

    private Dm = 0;
    private originD = 0;
    private dssData: BehaviorSubject<DSSData>;

    public isEuclide = false;
    public currentPage: BehaviorSubject<PAGE_NAME>;

    constructor(
        private afStore: AngularFirestore,
        private http: HttpClient,
    ) {
        this.currentPage = new BehaviorSubject<PAGE_NAME>(PAGE_NAME.Map);
        this.dssData = new BehaviorSubject<DSSData>({
            init: false,
            D: this.Dm,
            POINTS: [],
            CENTER: { key: 0, x: 0, y: 0 },
            PATHS: [],
            N_PROGRAMS: 0,
            NAME: '...',
            NQ: [0],
            F: [0],
            X: [0],
            Xnorm: [0],
            XSum: 0,
            Qmax: 0,
            Qij: [{}],
            currentProgram: 'P1',
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
                SavingPrograms: {
                    columns: [''],
                    data: [{}]
                },
            }
        });
    }

    private getX(points: Array<Point>) {
        let XSum = 0;

        const X: Array<number> = [];
        const Xnorm: Array<number> = [];

        for (let i = 0; i < points.length; i++) {
            const value = Math.random();

            X.push(value);
            XSum += value;
        }

        for (let i = 0; i < points.length; i++) {
            Xnorm.push(X[i] / XSum);
        }

        return { XSum: +XSum.toFixed(4), X, Xnorm };
    }

    private getNQ(nPrograms: number) {
        const nq: Array<number> = [];

        for (let i = 0; i < nPrograms; i++) {
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
                row['P' + (j + 1)] = +value.toFixed(4);

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

    pointsToScreenXY(points: Array<Point>) {
        points = JSON.parse(JSON.stringify(points));

        // https://stackoverflow.com/a/53827343
        const radius = 6371;

        const lats = points.map((p) => p.x);
        const lngs = points.map((p) => p.y);

        const p0 = {
            scrX: 1,
            scrY: 1,
            lat: Math.max.apply(null, lats),
            lng: Math.max.apply(null, lngs),
        } as any;

        const p1 = {
            scrX: 999,
            scrY: 999,
            lat: Math.min.apply(null, lats),
            lng: Math.min.apply(null, lngs)
        } as any;

        const latlngToGlobalXY = (lat: number, lng: number) => {
            let x = radius * lng * Math.cos((p0.lat + p1.lat) / 2);
            let y = radius * lat;
            return { x: x, y: y } as any;
        };

        p0.pos = latlngToGlobalXY(p0.lat, p0.lng);
        p1.pos = latlngToGlobalXY(p1.lat, p1.lng);

        const latlngToScreenXY = (lat: number, lng: number) => {
            let pos = latlngToGlobalXY(lat, lng);
            pos.perX = ((pos.x - p0.pos.x) / (p1.pos.x - p0.pos.x));
            pos.perY = ((pos.y - p0.pos.y) / (p1.pos.y - p0.pos.y));

            return {
                x: +(p1.scrX - (p1.scrX - p0.scrX) * pos.perX).toFixed(4),
                y: +(p1.scrY - (p1.scrY - p0.scrY) * pos.perY).toFixed(4),
            }
        }

        return points.map(e => {
            const res = latlngToScreenXY(e.x, e.y);
            return { ...e, ...res };
        });
    }

    private getDistance2Point(points: Array<Point>, paths: Array<Path>) {
        const data = [];
        const columns: Array<string> = ['N'];

        if (this.isEuclide) {
            points = this.pointsToScreenXY(points);
        }

        for (let i = 0; i < points.length; i++) {
            columns.push(`${points[i].key}`);
            const row = { N: points[i].key } as any;
            for (let j = 0; j < points.length; j++) {
                if (this.isEuclide) {
                    row[points[j].key] = +Math.sqrt(Math.pow((points[i].x - points[j].x), 2) + Math.pow((points[i].y - points[j].y), 2)).toFixed(4);
                } else {
                    const el = Object.values(paths).find(e => e.points[0] === points[i].key && e.points[1] === points[j].key);
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

        const keys = Object.keys(distance[0]).map(e => +e).filter(e => Number.isInteger(e)).sort((a, b) => a - b);

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

        return {
            columns,
            data: [{
                Path: savingPath.join('-')
            }]
        };
    }

    calcPrograms(dss: DSSData) {
        const data: Array<any> = [];
        const columns: Array<string> = ['N', 'Path', 'D'];

        const D = dss.D;
        const N_PROGRAMS = dss.N_PROGRAMS;
        const SAVING = dss.tables.SavingPath.data[0]['Path'] as string;
        const Qij: Array<any> = [];

        SAVING.split('-')
            .forEach(point => {
                if (+point) {
                    const el = dss.Qij.find(e => 1 + e.i === +point);
                    Qij.push(el);
                }
            });

        for (let i = 0; i < N_PROGRAMS; i++) {
            const key = 'P' + (i + 1);

            data.push({ N: key, Path: '', D: '', key });

            const paths: Array<{ Path: string, D: number }> = [];
            let tmpD = D;
            let tmpPath = '0';

            for (let j = 0; j < Qij.length; j++) {
                const q = Qij[j];
                const nextQ = (Qij[j + 1] || {});

                if (nextQ[key] && tmpD - (nextQ[key] + q[key]) > 0) {
                    tmpPath += '-' + (q.i + 1);
                    tmpD -= q[key];
                } else if (!nextQ[key]) {
                    tmpPath += '-' + (q.i + 1);
                    tmpD -= q[key];
                    tmpPath += '-0';
                    paths.push({ Path: tmpPath, D: +(D - tmpD) .toFixed(4)});
                } else {
                    tmpPath += '-0';
                    paths.push({ Path: tmpPath, D: +(D - tmpD) .toFixed(4) });
                    tmpD = D;
                    tmpPath = '0-' + (q.i + 1);
                }
            }

            paths.forEach((p, inx) => {
                data.push({
                    N: inx + 1,
                    Path: p.Path,
                    D: p.D,
                    key,
                });
            });
        }

        return {
            columns,
            data
        };
    }

    setEuclide(status: boolean) {
        this.isEuclide = status;
        setTimeout(() => {
            this.prepareData({ ...this.dssData.value, D: this.originD });
        });
    }

    setMapView(viewMode: VIEW_MODE) {
        this.dssData.next({
            ...this.dssData.value,
            viewMode
        });
    }

    setProgram(program: string) {
        this.dssData.next({
            ...this.dssData.value,
            currentProgram: program
        });
    }

    getDssData$(): Observable<DSSData> {
        return this.dssData.asObservable();
    }

    getCurrentPage$(): Observable<PAGE_NAME> {
        return this.currentPage.asObservable();
    }

    prepareData(doc: Partial<DSSData>) {
        this.Dm = doc.D!;

        const NQ = this.getNQ(doc.N_PROGRAMS!);
        const F = this.getFs(NQ);
        const { XSum, X, Xnorm } = this.getX(doc.POINTS!);
        const { Qij, Qmax } = this.getQij(F, Xnorm);
        const distance = this.getDistance2Point([doc.CENTER!, ...doc.POINTS!], doc.PATHS!);
        const savingTable = this.calcSavingTable(distance.data);
        const savingPath = this.calcSavingPath(savingTable.data);

        if (Qmax > this.Dm) {
            console.log('-- Updated D --');
            this.Dm = Qmax + Math.random() * ((Qmax * 0.1) - 0 + 1) + 0;
        }

        const data = {
            ...doc,
            init: true,
            D: this.Dm,
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
                    data: [{ D: doc.D!, X_sum: XSum, Q_max: Qmax }],
                },
                Distance: distance,
                SavingTable: savingTable,
                SavingPath: savingPath,
            }
        } as DSSData;

        data.tables.SavingPrograms = this.calcPrograms(data);

        console.log('data::', data);
        this.dssData.next(data);
    }

    chunkArray(input: Array<any>, bytesSize = 1000000) {
        const getObjectSize = (obj: any) => {
            try {
                const str = JSON.stringify(obj);
                return new Blob([str]).size;
            } catch (error) {
                return 0;
            }
        };

        const output: Array<any> = [];
        let outputSize = 0;
        let outputFreeIndex = 0;

        if (!input || input.length === 0 || bytesSize <= 0) {
            return output;
        }

        for (let obj of input) {
            const objSize = getObjectSize(obj);
            const fitsIntoLastChunk = (outputSize + objSize) <= bytesSize;

            if (fitsIntoLastChunk) {
                if (!Array.isArray(output[outputFreeIndex])) {
                    output[outputFreeIndex] = [];
                }

                output[outputFreeIndex].push(obj);
                outputSize += objSize;
            } else {
                if (output[outputFreeIndex]) {
                    outputFreeIndex++;
                    outputSize = 0;
                }

                output[outputFreeIndex] = [];
                output[outputFreeIndex].push(obj);
                outputSize += objSize;
            }
        }

        return output;
    }

    loadLibrary() {
        return this.afStore.collection('library', ref => ref.orderBy('updated', 'desc')).get();
    }

    setCurrentDocument(id: string, isTest = false, prepare = true) {
        let doc = {
            ID: id,
        } as Partial<DSSData>;

        if (isTest) {
            return of(TEST_DOC).pipe(map((doc: Partial<DSSData>) => {
                this.originD = doc.D!;

                doc.CENTER = doc.CENTER || doc.POINTS!.find(e => e.key === 0);
                doc.POINTS = doc.POINTS!.filter(e => e.key !== 0);

                if (prepare) {
                    this.prepareData(doc)
                }
                return doc as Partial<DSSData>;
            }));
        }

        return this.afStore
            .collection('library')
            .doc(id)
            .get()
            .pipe(
                switchMap(res => {
                    doc = {
                        ...doc,
                        ...res.data() as Partial<DSSData>
                    };

                    this.originD = doc.D!;

                    doc.CENTER = doc.POINTS!.find(e => e.key === 0);
                    doc.POINTS = doc.POINTS!.filter(e => e.key !== 0);

                    return this.afStore
                        .collection('library')
                        .doc(id)
                        .collection('paths')
                        .get();
                }),
                map(res => {
                    let PATHS: Array<Path> = [];

                    res.docs.forEach(e => {
                        const points = e.data().data as Array<Path>;
                        PATHS = PATHS.concat(points);
                    });

                    doc.PATHS = PATHS;

                    if (prepare) {
                        this.prepareData(doc);
                    }
                    return doc;
                }),
            );
    }

    setDocument(data: Partial<DSSData>) {
        const doc = {
            NAME: data.NAME,
            POINTS: data.POINTS,
            PATHS: data.PATHS,
            N_PROGRAMS: data.N_PROGRAMS,
            D: data.D,
            updated: new Date().getTime()
        };

        if (!data.ID) {
            let id = '';
            return this.afStore
                .collection('library')
                .add({
                    NAME: doc.NAME,
                    N_PROGRAMS: doc.N_PROGRAMS,
                    POINTS: doc.POINTS,
                    D: doc.D,
                    updated: doc.updated,
                })
                .then(async res => {
                    id = res.id;
                    const paths = this.chunkArray(doc.PATHS!);

                    for (const path of paths) {
                        console.log(path);
                        await this.afStore
                            .collection('library')
                            .doc(id)
                            .collection('paths')
                            .add({ data: path });
                    }
                });
        } else {
            return this.afStore
                .collection('library')
                .doc(data.ID)
                .set({
                    NAME: doc.NAME,
                    N_PROGRAMS: doc.N_PROGRAMS,
                    POINTS: doc.POINTS,
                    D: doc.D,
                    updated: doc.updated,
                })
                .then(async res => {
                    const paths = this.chunkArray(doc.PATHS!);
                    const remove: Array<string> = [];

                    await this.afStore
                        .collection('library')
                        .doc(data.ID)
                        .collection('paths')
                        .ref
                        .get()
                        .then(e => {
                            e.docs.forEach(k => {
                                remove.push('library/' + data.ID + '/paths/' + k.id);
                            });
                        });

                    for (const path of paths) {
                        console.log(path);
                        await this.afStore
                            .collection('library')
                            .doc(data.ID)
                            .collection('paths')
                            .add({ data: path });
                    }

                    remove.forEach(e => {
                        this.afStore.doc(e).delete();
                    });
                });
        }
    }

    getPath(from: Point, to: Point) {
        return this.http.get(`http://router.project-osrm.org/route/v1/driving/${from.y},${from.x};${to.y},${to.x}?overview=full`);
    }
}