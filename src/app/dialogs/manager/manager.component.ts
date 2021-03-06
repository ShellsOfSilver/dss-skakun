import { FormArray, FormBuilder, FormControl, FormGroup, FormGroupDirective, NgForm, Validators } from '@angular/forms';
import { AfterViewInit, Component, Inject, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorStateMatcher } from '@angular/material/core';

import { Subject, timer } from 'rxjs';
import { debounce, takeUntil } from 'rxjs/operators';

import * as L from 'leaflet';

import { DSSService } from '../../services/dss.service';
import { DSSData, Path, Point } from '../../models/dss';

export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

@Component({
  selector: 'app-manager',
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.scss']
})
export class ManagerDialog implements AfterViewInit, OnDestroy {

  subSubject: Subject<any>;
  map!: L.Map;
  form!: FormGroup;
  markers: Array<L.Marker>;
  matcher = new MyErrorStateMatcher();
  isLoading: number;
  isMapClick: FormControl | null;
  paths: Array<Path>;
  snack: any;
  subProgramsLen: number;

  constructor(
    @Inject(MAT_DIALOG_DATA) public documentData: Partial<DSSData>,
    private dialogRef: MatDialogRef<ManagerDialog>,
    private dssService: DSSService,
    private _snackBar: MatSnackBar,
    private fb: FormBuilder,
  ) {
    this.subSubject = new Subject();
    this.markers = [];
    this.paths = [];
    const points = [];
    this.isLoading = 0;
    const dValue = { N_PROGRAMS: 3,  D: 5 };
    this.subProgramsLen = 0;

    if (documentData.PATHS?.length) {
      this.paths = documentData.PATHS;
    }

    if (documentData.POINTS?.length) {
      documentData.POINTS.forEach((e, i) => {
        const programs: Array<{pr: string}> = [];
        (e.programs || []).forEach(l => programs.push({pr: `${l}`}));
        points.push(this.fb.group({
          'xy': this.fb.control(`${e?.x}, ${e?.y}`, [Validators.required]),
          'key': this.fb.control(i + 1, [Validators.required]),
          'programs': this.generatePrograms((documentData?.N_PROGRAMS || dValue.N_PROGRAMS), programs),
        }));
      });
    } else {
      points.push(this.fb.group({
        'xy': this.fb.control('', [Validators.required]),
        'key': this.fb.control(1, [Validators.required]),
        'programs': this.generatePrograms((documentData?.N_PROGRAMS || dValue.N_PROGRAMS)),
      }));
    }

    this.form = this.fb.group({
      'NAME': this.fb.control(documentData.NAME || '', [Validators.required]),
      'D': this.fb.control(documentData.D || dValue.D, [Validators.required]),
      'N_PROGRAMS': this.fb.control(documentData.N_PROGRAMS || dValue.N_PROGRAMS, [Validators.required]),
      'CENTER': this.fb.group({
        'xy': this.fb.control(documentData.CENTER?.x ? `${documentData.CENTER?.x}, ${documentData.CENTER?.y}` : '', [Validators.required]),
        'key': this.fb.control(documentData.CENTER?.key || 0, [Validators.required]),
      }),
      'POINTS': this.fb.array(points),
      'C_LIST': this.generateCList(5, documentData.C_LIST || []),
      'Q_LIST': this.generateQList(documentData.N_PROGRAMS || dValue.N_PROGRAMS, documentData.Q_LIST || []),
    });

    this.form.valueChanges
      .pipe(
        takeUntil(this.subSubject),
        debounce(() => timer(300))
      )
      .subscribe(value => {
        this.markers.forEach(e => {
          e.remove();
        });

        try {
          if (value?.CENTER?.xy) {
            this.createMarker(value?.CENTER?.xy, value?.CENTER?.key, 'assets/pin_center.svg');
          }
        } catch (er) { }

        if (!Number.isInteger(value.N_PROGRAMS)) {
          this._snackBar.open('Program must be an integer', 'Ok', { duration: 2000 });
          this.form.get('N_PROGRAMS')?.patchValue(0);
        } else if (value.N_PROGRAMS) {
          if (+this.subProgramsLen !== +value.N_PROGRAMS) {
            this.subProgramsLen = value.N_PROGRAMS;

            const controls = this.generateQList(this.subProgramsLen, value.Q_LIST.map((cL: any) => +cL.q)).controls;
            (this.form.get('Q_LIST')! as FormArray).clear();
            controls.forEach((ctrl, inx) => (this.form.get('Q_LIST')! as FormArray).insert(inx, ctrl));

            (this.form.get('POINTS')! as FormArray).controls
            .forEach((control) => {
              const value = (control as FormGroup).get('programs')?.value;
              (control as FormGroup).removeControl('programs');
              (control as FormGroup).addControl('programs', this.generatePrograms(this.form.get('N_PROGRAMS')?.value, value));
            });
          }
        }

        if (value?.POINTS?.length) {
          value.POINTS.forEach((el: any) => {
            try {
              if (el.xy) {
                this.createMarker(el.xy, el.key, 'assets/pin.svg');
              }
            } catch (er) { }
          });
        }
      });

    this.form.updateValueAndValidity();

    this.isMapClick = null;
  }

  private generateQList(len: number, oldValue: Array<number>) {
    const controls = [];
    for (let i = 0; i < len; i++) {
      const el = (oldValue || [])[i];
      controls.push(this.fb.group({ 'q': this.fb.control(el, [Validators.required]) }));
    }
    return this.fb.array(controls);
  };

  private generateCList(len: number, oldValue: Array<number>) {
    const controls = [];
    for (let i = 0; i < len; i++) {
      const el = (oldValue || [])[i];
      controls.push(this.fb.group({ 'c': this.fb.control(el, [Validators.required]) }));
    }
    return this.fb.array(controls);
  };

  private generatePrograms(len: number, oldValue?: Array<{pr: string}>) {
    const controls = [];
    for (let i = 0; i < len; i++) {
      const el = (oldValue || [])[i]?.pr;
      controls.push(this.fb.group({ 'pr': this.fb.control(el, [Validators.required]) }));
    }
    this.subProgramsLen = len;
    return this.fb.array(controls);
  };

  private createMarker(point: string, key: number, iconUrl: string) {
    const x = +point.split(',')[0];
    const y = +point.split(',')[1];

    const marker = L.marker(L.latLng(x, y), {
      icon: L.divIcon({
        iconSize: [50, 50],
        iconAnchor: [25, 50],
        html: ` <img src="${iconUrl}">  <div class="lable">${key}</div> `,
        className: 'text-below-marker',
      }),
      data: point,
      draggable: true,
    } as any);

    marker.bindTooltip(`???${key} [${x}, ${y}]`);
    marker.addTo(this.map);

    marker.on('dragend', (event) => {
      const mrk = event.target;
      const position = mrk.getLatLng();

      if (key === 0) {
        this.form.get('CENTER')?.patchValue({
          xy: `${position.lat}, ${position.lng}`
        });
      } else {
        const arr = (this.form.get('POINTS')! as FormArray);
        arr.controls.forEach((ctr) => {
          if (ctr.get('key')?.value === key) {
            ctr.patchValue({
              xy: `${position.lat}, ${position.lng}`
            });
          }
        });
      }
    });

    this.markers.push(marker);
  }

  ngAfterViewInit() {
    this.map = L.map('managerMap').setView([46.962875, 31.984301], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
      subdomains: ['a', 'b', 'c', 'd'],
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(this.map);

    this.map.on('click', (point: any) => {
      if (this.isMapClick) {
        this.isMapClick.setValue(`${point.latlng.lat}, ${point.latlng.lng}`);
        this.isMapClick = null;

        if (this.snack) {
          this.snack.dismiss()
        }
      }
    });
  }

  ngOnDestroy() {
    this.map.off();
    this.map.remove();
    this.subSubject.next(true);
    this.subSubject.complete();
  }

  getLatLngFromMap(formControl: FormControl) {
    this.isMapClick = formControl;
    this.snack = this._snackBar.open('Click on the map to fill in the coordinates', 'Ok');
  }

  removePoint(formControl: FormControl, inx: number) {
    const arr = (this.form.get('POINTS')! as FormArray);

    if (arr.length > 1) {
      arr.removeAt(inx);
      arr.controls.forEach((ctr, i) => {
        ctr.get('key')?.setValue(i + 1);
      });
    } else {
      formControl.setValue('');
    }
  }

  addPoint() {
    const len = (this.form.get('POINTS')! as FormArray).length;
    const control = this.fb.group({
      'xy': this.fb.control('', [Validators.required]),
      'key': this.fb.control(len + 1, [Validators.required]),
      'programs': this.generatePrograms(this.form.get('N_PROGRAMS')?.value),
    });

    (this.form.get('POINTS')! as FormArray).push(control);
    this.getLatLngFromMap(control.get('xy') as FormControl);
  }

  close() {
    this.dialogRef.close();
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    (<any>Object).values(formGroup.controls).forEach((control: any) => {
      control.markAsTouched();

      if (control.controls) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private validate() {
    if (!this.form.valid) {
      this._snackBar.open('Please enter all required data', 'Ok', { duration: 2000 });
      this.markFormGroupTouched(this.form);
      return true;
    }

    const ivalidCoords = (xy: string, key: number) => {
      const x = +xy.split(',')[0];
      const y = +xy.split(',')[1];

      if (x && y) {
        return false;
      }

      if (key === 0) {
        this._snackBar.open('Center must be a valid coordinate', 'Ok', { duration: 2000 });
      } else {
        this._snackBar.open(`Point ???${key} must be a valid coordinate`, 'Ok', { duration: 2000 });
      }

      return true;
    };

    const value = this.form.value;

    if (!Number.isInteger(value.N_PROGRAMS)) {
      this._snackBar.open('Program must be an integer', 'Ok', { duration: 2000 });
      return true;
    }

    if (value.N_PROGRAMS <= 0) {
      this._snackBar.open('Program must be greater than 0', 'Ok', { duration: 2000 });
      return true;
    }

    if (value.D <= 0) {
      this._snackBar.open('D must be greater than 0', 'Ok', { duration: 2000 });
      return true;
    }

    if (ivalidCoords(value.CENTER.xy, value.CENTER.key)) {
      return true;
    }

    for (const point of value.POINTS) {
      if (ivalidCoords(point.xy, point.key)) {
        return true;
      }
      for (const pr of point.programs) {
        if (pr.pr <= 0 || Number.isNaN(+pr.pr)) {
          this._snackBar.open(`Point ???${point.key} must have programs greater than zero or to be number`, 'Ok', { duration: 2000 });
          return true;
        }
      }
    }
    return false;
  }

  async save() {
    if (this.validate()) {
      console.log(this.form);
      return;
    }

    const points: Array<Point> = [];
    const value = this.form.value;
    const qList = value.Q_LIST.map((cL: any) => +cL.q);

    if (qList.reduce((a: number, b: number) => a + b, 0) !== 1) {
      this._snackBar.open('The sum of the "Probability of occurrence" must be equal to 1', 'OK', { duration: 2000 });
      return;
    }

    this.isLoading = 0.1;

    const setPoint = (point: any) => {
      const x = +point.xy.split(',')[0];
      const y = +point.xy.split(',')[1];
      const programs: Array<number> = [];
      (point.programs || []).forEach((el: any) => {
        programs.push(+el.pr)
      });

      points.push({
        x, y, key: point.key, programs
      });
    };

    setPoint(value.CENTER);
    for (const point of value.POINTS) {
      setPoint(point);
    }

    try {
      let i = 0;

      for (const point of points) {
        for (const point1 of points) {
          const key1 = point.x + '_' + point.y + '*' + point1.x + '_' + point1.y;
          const key2 = point1.x + '_' + point1.y + '*' + point.x + '_' + point.y;
          const el = this.paths.find(e => e.ID === key1);

          if (!el) {
            const res = await this.dssService.getPath(point, point1).toPromise() as any;
            const body1 = {
              ID: key1,
              geometry: res.routes[0].geometry,
              distance: res.routes[0].distance,
              points: [point.key, point1.key]
            };
            const body2 = {
              ID: key2,
              geometry: res.routes[0].geometry,
              distance: res.routes[0].distance,
              points: [point1.key, point.key]
            };

            this.paths.push(body1);
            this.paths.push(body2);
          }
          i++;
          this.isLoading = Math.min((i / (points.length * points.length)) * 100, 100);
        }
      }

      const localPaths = [] as Array<Path>;

      for (const point of points) {
        for (const point1 of points) {
          const key1 = point.x + '_' + point.y + '*' + point1.x + '_' + point1.y;
          localPaths.push(this.paths.find(e => e.ID === key1)!);
        }
      }

      await this.dssService.setDocument({
        ...this.documentData,
        POINTS: points,
        C_LIST: value.C_LIST.map((cL: any) => +cL.c),
        Q_LIST: qList,
        PATHS: localPaths,
        NAME: value.NAME,
        N_PROGRAMS: value.N_PROGRAMS,
        D: value.D,
      });

      this.dialogRef.close(true);
    } catch (err) {
      console.log(err);
      this.isLoading = 0;
      this._snackBar.open('Oops, Something Went Wrong', 'OK', { duration: 2000 });
    }
  }
}