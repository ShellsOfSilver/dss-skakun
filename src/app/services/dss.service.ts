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
            Qij: [{}],
            currentProgram: 'P1',
            viewMode: 'paths',
            tables: {
                Q: {
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
                Sweeping: {
                    columns: [''],
                    data: [{}]
                },
                SweepingPath: {
                    columns: [''],
                    data: [{}]
                },
                SweepingPrograms: {
                    columns: [''],
                    data: [{}]
                },
                ComparePrograms: {
                    columns: [''],
                    data: [{}]
                },
                SolutionMatrix: {
                    columns: [''],
                    data: [{}]
                },
            }
        });
    }

    private getQij(Points: Array<Point>) {
        const Qij: Array<{ [key: string]: number }> = [];
        for (let i = 0; i < Points.length; i++) {
            const row: { [key: string]: number } = { i };
            for (let j = 0; j < (Points[i].programs?.length || 0); j++) {
                row['P' + (j + 1)] = Points[i].programs![j];
            }
            Qij.push(row);
        }
        return Qij;
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

    calcSweepingPath(sweeping: Array<any>) {
        const sweepingPath: Array<any> = ['0'];
        const columns: Array<string> = ['Path'];

        sweeping.forEach(e => {
            sweepingPath.push(`${e['N']}`);
        });

        sweepingPath.push('0');

        return {
            columns,
            data: [{
                Path: sweepingPath.join('-')
            }]
        };
    }

    calcSavingPath(distance: Array<any>) {
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

    calcMSolutionMatrix(dss: DSSData) {
        const data: Array<any> = [];
        const columns: Array<string> = ['N'];
        const bestProgramsName = dss.tables.ComparePrograms.data.find(e => e.N === 'Sum').top;
        const bestProgramsData = (dss.tables as any)[bestProgramsName].data as Array<any>;

        const pMaxProgramsLength = Math.min(...bestProgramsData.filter(e => e.N === 'Sum').map(e => e.size));
        const pDTotalSum = {} as any;

        for (let i = 0; i < dss.N_PROGRAMS; i++) {
            const key = 'P' + (i + 1);
            pDTotalSum[key] = 0;
            const rj = bestProgramsData.find(e => e.N === 'Sum' && e.key === key).size;
            dss.tables.Q.data.forEach(e => pDTotalSum[key] += e[key]);
            columns.push(`${key} = ${rj}, [${pDTotalSum[key]}]`);
        }

        const E1 = Math.floor(pDTotalSum['P1'] / dss.D);
        const Ermax = Math.floor((pDTotalSum['P' + dss.N_PROGRAMS] / dss.D)) + 2;
        const Mz = Ermax - E1 + 1;
        const cList = dss.C_LIST || [];

        for (let i = 0; i < Mz; i++) {
            const key = `E${i + 1} = ${pMaxProgramsLength + i}`;
            const tmp: Record<string, any> = { N: key };

            for (let j = 0; j < dss.N_PROGRAMS; j++) {
                const pKey = columns[j + 1].split(' = ')[0];
                const rj = bestProgramsData.find(e => e.N === 'Sum' && e.key === pKey).size;
                const m = (pMaxProgramsLength + i);

                const disPrograms = dss.tables.ComparePrograms.data.find(e => e.N === pKey);
                const lRj = +(bestProgramsName === 'SavingPrograms' ? disPrograms.Saving : disPrograms.Sweeping).split(' ')[0];
                const dSj = +pDTotalSum[pKey];

                tmp[columns[j + 1]] = +((cList[0] * dSj)
                - (cList[1] * lRj)
                - (cList[2] * rj)
                - (rj >= m ? (cList[3] * (rj - m)) : (cList[4] * (m - rj)))).toFixed(2)
            }
            data.push(tmp);
        }

        return this.calcOptimalNumberTransport(data, dss.Q_LIST || [], columns);
    }

    // http://ouek.onu.edu.ua/uploads/courses/smpr/Критерии%20принятия%20решений%20в%20условиях%20неопределенности.pdf
    private calcOptimalNumberTransport(data: Array<any>, qList: Array<number>, columns: Array<string>) {
        const pList = columns.filter(e => e.startsWith('P'));
        const hwL = 0.5;
        const hlV = 0.5;
        let maxRowIJ: Array<number> = [];

        columns.push('MM', 'BL', 'S', 'HW', 'HL', 'G', 'P');

        // MM
        let mmMax = {} as any;
        data.forEach((row, inx) => {
            let min = row[pList[0]];
            pList.forEach((key, i) => {
                if (row[key] < min) {
                    min = row[key];
                }
                if (maxRowIJ[i] === undefined || row[key] > maxRowIJ[i]) {
                    maxRowIJ[i] = row[key];
                }
            });

            row['MM'] = min;
            if (!mmMax.value || min > mmMax.value) {
                mmMax.value = min;
                mmMax.inx = inx + 1;
            }
        });

        // BL
        let blMax = {} as any;
        data.forEach((row, inx) => {
            let bl = 0;
            pList.forEach((key, i) => {
                bl += row[key] * qList[i];
            });

            row['BL'] = +bl.toFixed(2);
            if (!blMax.value || row['BL'] > blMax.value) {
                blMax.value = row['BL'];
                blMax.inx = inx + 1;
            }
        });

        // S
        let sMax = {} as any;
        data.forEach((row, inx) => {
            let s: number;
            pList.forEach((key, i) => {
                const value = maxRowIJ[i] - row[key];
                if (s === undefined || value > s) {
                    s = value;
                }
            });

            row['S'] = +(s!).toFixed(2);
            if (!sMax.value || row['S'] < sMax.value) {
                sMax.value = row['S'];
                sMax.inx = inx + 1;
            }
        });

        // HW
        let hwMax = {} as any;
        data.forEach((row, inx) => {
            let max: undefined;
            let min: undefined;
            pList.forEach((key) => {
                if (max === undefined || row[key] > max!) {
                    max = row[key];
                }
                if (min === undefined || row[key] < min!) {
                    min = row[key];
                }
            });

            row['HW'] = +((hwL * min!) + ((1 - hwL) * max!)).toFixed(2);
            if (!hwMax.value || row['HW'] > hwMax.value) {
                hwMax.value = row['HW'];
                hwMax.inx = inx + 1;
            }
        });

        // HL
        let hlMax = {} as any;
        data.forEach((row, inx) => {
            let sum = 0;
            let min: undefined;
            pList.forEach((key, i) => {
                sum += row[key] * qList[i];

                if (min === undefined || row[key] < min!) {
                    min = row[key];
                }
            });

            row['HL'] = +((hlV * sum) + (1 - hlV) * min!).toFixed(2);
            if (!hlMax.value || row['HL'] > hlMax.value) {
                hlMax.value = row['HL'];
                hlMax.inx = inx + 1;
            }
        });

        // G
        let gMax = {} as any;
        const maxGEij = Math.max(...maxRowIJ) + 1;
        data.forEach((row, inx) => {
            let min: number;
            pList.forEach((key, i) => {
                const value = (maxGEij >= 0 ? row[key] - (maxGEij + 1) : row[key]) * qList[i];

                if (min === undefined || value < min!) {
                    min = value;
                }
            });

            row['G'] = +(min!).toFixed(2);
            if (!gMax.value || row['G'] > gMax.value) {
                gMax.value = row['G'];
                gMax.inx = inx + 1;
            }
        });

        // P
        let pMax = {} as any;
        data.forEach((row, inx) => {
            let mul = 1;
            pList.forEach((key) => {
                mul += row[key];
            });

            row['P'] = +(mul).toFixed(2);
            if (!pMax.value || row['P'] > pMax.value) {
                pMax.value = row['P'];
                pMax.inx = inx + 1;
            }
        });

        data.push({
            N: 'Z',
            MM: mmMax.value, BL: blMax.value, S: sMax.value,
            HW: hwMax.value, HL: hlMax.value, G: gMax.value, P: pMax.value
        });
        data.push({
            N: 'Opt.m',
            MM: mmMax.inx, BL: blMax.inx, S: sMax.inx,
            HW: hwMax.inx, HL: hlMax.inx, G: gMax.inx, P: pMax.inx
        });
        return { columns, data };
    }

    comparePrograms(dss: DSSData) {
        const data: Array<any> = [];
        const columns: Array<string> = ['N', 'Saving', 'Sweeping'];

        let savingSum = 0;
        let sweepingSum = 0;

        for (let i = 0; i < dss.N_PROGRAMS; i++) {
            const key = 'P' + (i + 1);

            const sweeping = dss.tables.SweepingPrograms.data.find(e => e.key === key && e.N === 'Sum');
            const saving = dss.tables.SavingPrograms.data.find(e => e.key === key && e.N === 'Sum');

            savingSum += saving?.total;
            sweepingSum += sweeping?.total;

            data.push({ N: key, Saving: saving?.Distance, Sweeping: sweeping?.Distance });
        }

        data.push({
            N: 'Sum',
            Saving: (+`${savingSum / 1000}`).toFixed(4) + ' km',
            Sweeping: (+`${sweepingSum / 1000}`).toFixed(4) + ' km',
            top: savingSum > sweepingSum ? 'SweepingPrograms' : 'SavingPrograms',
        });

        return { columns, data };
    }

    calcPrograms(dss: DSSData, key: string) {
        const data: Array<any> = [];
        const columns: Array<string> = ['N', 'Path', 'D', 'Distance'];

        const D = dss.D;
        const N_PROGRAMS = dss.N_PROGRAMS;
        const PATHS = (dss.tables as any)[key].data[0]['Path'] as string;
        const Qij: Array<any> = [];

        PATHS.split('-')
            .forEach(point => {
                if (+point) {
                    const el = dss.Qij.find(e => 1 + e.i === +point);
                    Qij.push(el);
                }
            });

        for (let i = 0; i < N_PROGRAMS; i++) {
            const key = 'P' + (i + 1);
            let totalDis = 0;
            data.push({ N: key, Path: '', D: '', key, Distance: '' });

            const paths: Array<{ Path: string, D: number }> = [];
            let tmpD = D;
            let tmpPath = '0';

            for (let j = 0; j < Qij.length; j++) {
                const q = Qij[j];

                if (tmpD - q[key] >= 0) {
                    tmpPath += '-' + (q.i + 1);
                    tmpD -= q[key];
                } else {
                    tmpPath += '-0';
                    paths.push({ Path: tmpPath, D: +(D - tmpD).toFixed(4) });
                    tmpD = D;
                    tmpPath = '0-' + (q.i + 1);
                }
            }

            paths.forEach((p, inx) => {
                let dis = 0;
                const PATHSValues = Object.values(dss.PATHS);
                const points = p.Path.split('-');

                points.forEach((key, inx) => {
                    if (inx) {
                        const el = PATHSValues.find(e => e.points.includes(+key) && e.points.includes(+points[inx - 1]))!;
                        dis += +el.distance;
                    }
                })

                totalDis += dis;

                data.push({
                    N: inx + 1,
                    Path: p.Path,
                    D: p.D,
                    key,
                    Distance: (+`${dis / 1000}`).toFixed(4) + ' km'
                });
            });

            data.push({ N: 'Sum', Path: '', D: '', key, size: paths.length, total: totalDis, Distance: (+`${totalDis / 1000}`).toFixed(4) + ' km' });
        }

        return { columns, data };
    }

    calcQ(Qij: Array<{ [key: string]: number }>, points: Array<Point>) {
        if (this.isEuclide) {
            points = this.pointsToScreenXY(points);
        }

        return {
            columns: ['N', 'X', 'Y', ...Object.keys(Qij[0]).filter(e => e.startsWith('P'))],
            data: Qij.map((e, i) => ({
                N: i + 1,
                X: points[i].x,
                Y: points[i].y,
                ...Qij[i]
            })),
        }
    }

    calcSweeping(points: Array<Point>, center: Point) {
        const newCoords: Array<Point> = [];
        const data: Array<any> = [];
        let coords = [center, ...points];

        if (this.isEuclide) {
            coords = this.pointsToScreenXY(coords);
        }

        for (let i = 1; i < coords.length; i++) {
            const x = coords[i].x - coords[0].x;
            const y = coords[i].y - coords[0].y;
            newCoords.push({ ...coords[i], x, y });

            const R = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
            const Angle = Math.atan2(y, x); // https://www.omnicalculator.com/math/cartesian-to-polar

            data.push({
                N: coords[i].key,
                X: x,
                Y: y,
                Angle,
                'Polar radius': R
            });
        }

        data.sort((a, b) => {
            if (a.Angle < b.Angle) {
                return -1;
            } else if (a.Angle > b.Angle) {
                return 1;
            } else {
                return b['Polar radius'] - a['Polar radius'];
            }
        });

        return {
            columns: ['N', 'X', 'Y', 'Angle', 'Polar radius'],
            data,
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

        const Qij = this.getQij(doc.POINTS!);
        const distance = this.getDistance2Point([doc.CENTER!, ...doc.POINTS!], doc.PATHS!);
        const savingTable = this.calcSavingTable(distance.data);
        const savingPath = this.calcSavingPath(savingTable.data);
        const qInfo = this.calcQ(Qij, doc.POINTS!);
        const sweeping = this.calcSweeping(doc.POINTS!, doc.CENTER!);
        const sweepingPath = this.calcSweepingPath(sweeping.data);

        const data = {
            ...doc,
            init: true,
            D: this.Dm,
            Qij,
            viewMode: this.dssData.value.viewMode,
            tables: {
                Q: qInfo,
                Distance: distance,
                SavingTable: savingTable,
                SavingPath: savingPath,
                Sweeping: sweeping,
                SweepingPath: sweepingPath,
            }
        } as DSSData;

        data.tables.SavingPrograms = this.calcPrograms(data, 'SavingPath');
        data.tables.SweepingPrograms = this.calcPrograms(data, 'SweepingPath');
        data.tables.ComparePrograms = this.comparePrograms(data);
        data.tables.SolutionMatrix = this.calcMSolutionMatrix(data);

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
                    doc = { ...doc, ...res.data() as Partial<DSSData> };
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
            C_LIST: data.C_LIST,
            Q_LIST: data.Q_LIST,
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
                    C_LIST: doc.C_LIST,
                    Q_LIST: doc.Q_LIST,
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
                    C_LIST: doc.C_LIST,
                    Q_LIST: doc.Q_LIST,
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