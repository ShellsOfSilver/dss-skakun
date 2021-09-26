import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { ManagerDialog } from '../manager/manager.component';
import { DSSService } from '../../services/dss.service';
import { DSSData } from '../../models/dss';
import { TEST_DOC } from '../../data';

@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryDialog implements OnInit {

  documents: Array<Partial<DSSData>>;
  dssData!: Observable<DSSData | null>;
  isLoading: boolean;
  isError: boolean;

  constructor(
    public dialogRef: MatDialogRef<LibraryDialog>,
    private dssService: DSSService,
    private _snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {
    this.documents = [];
    this.isLoading = false;
    this.isError = false;
  }

  ngOnInit() {
    this.dssData = this.dssService.getDssData$();
    this.loadDocs();

    // // test mode
    // setTimeout(() => {
    //   this.dssService.setCurrentDocument('', true)
    //   .subscribe(res => {
    //     this.dialogRef.close();
    //   }, err => {
    //     console.log(err);
    //     this._snackBar.open('Oops, Something Went Wrong', 'OK');
    //     this.isError = true;
    //     this.isLoading = false;
    //   });
    // })
  }

  private loadDocs() {
    this.isLoading = true;

    this.dssService.loadLibrary()
      .subscribe(res => {
        this.documents = res.docs.map(e => ({ ...e.data() as Partial<DSSData>, ID: e.id }));
        this.isLoading = false;
      }, err => {
        console.log(err);
        this._snackBar.open('Oops, Something Went Wrong', 'OK');
        this.isError = true;
        this.isLoading = false;
      });
  }

  selectDocument(doc: { ID: string }) {
    this.isLoading = true;

    this.dssService.setCurrentDocument(doc.ID)
      .subscribe((res: Partial<DSSData>) => {
        this.dialogRef.close();
      }, err => {
        console.log(err);
        this._snackBar.open('Oops, Something Went Wrong', 'OK', { duration: 2000 });
        this.isError = true;
        this.isLoading = false;
      });
  }

  editDocument(doc: { ID: string }) {
    this.isLoading = true;

    this.dssService.setCurrentDocument(doc.ID, false, false)
      .subscribe((res: Partial<DSSData>) => {
        const vin = this.dialog.open(ManagerDialog, { disableClose: true, data: res });
        const ref = vin.afterClosed().subscribe(e => {
          if (e) {
            this.loadDocs();
          }
          if (ref) {
            ref.unsubscribe();
          }
        });
        this.isLoading = false;
      }, err => {
        console.log(err);
        this._snackBar.open('Oops, Something Went Wrong', 'OK');
        this.isLoading = false;
      });
  }

  createDocument() {
    const vin = this.dialog.open(ManagerDialog, { disableClose: true, data: {} });
    const ref = vin.afterClosed().subscribe(e => {
      if (e) {
        this.loadDocs();
      }
      if (ref) {
        ref.unsubscribe();
      }
    });
  }
}
