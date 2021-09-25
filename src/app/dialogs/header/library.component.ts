import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';

import { DSSService } from '../../services/dss.service';
import { DSSData } from '../../models/dss';

@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryDialog implements OnInit {

  documents: Array<Partial<DSSData>>;
  isLoading: boolean;
  isError: boolean;

  constructor(
    public dialogRef: MatDialogRef<LibraryDialog>,
    private dssService: DSSService,
    private _snackBar: MatSnackBar,
  ) {
    this.documents = [];
    this.isLoading = false;
    this.isError = false;
  }

  ngOnInit() {
    this.isLoading = true;

    this.dssService.loadLibrary()
      .subscribe(res => {
        this.documents = res.docs.map(e => ({ ...e.data() as Partial<DSSData>, ID: e.id }));
        this.isLoading = false;
      }, err => {
        console.log(err);
        this._snackBar.open('Oops, Something Went Wrong');
        this.isError = true;
        this.isLoading = false;
      });
  }

  selectDocument(doc: { ID: string }) {
    this.isLoading = true;

    this.dssService.setCurrentDocument(doc.ID)
      .subscribe(res => {
        this.dialogRef.close();
      }, err => {
        console.log(err);
        this._snackBar.open('Oops, Something Went Wrong');
        this.isError = true;
        this.isLoading = false;
      });
  }

  editDocument(doc: Partial<DSSData>) {
    console.log('editDocument', doc)
  }

  createDocument() {
    console.log('createDocument')
  }
}
