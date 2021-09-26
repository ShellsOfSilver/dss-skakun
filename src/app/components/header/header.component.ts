import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { Observable } from 'rxjs';

import { LibraryDialog } from '../../dialogs/library/library.component';
import { DSSService } from '../../services/dss.service';
import { DSSData } from '../../models/dss';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  dssData!: Observable<DSSData | null>;

  constructor(
    private dssService: DSSService,
    private dialog: MatDialog,
  ) { }

  ngOnInit() {
    this.dssData = this.dssService.getDssData$();
    this.openLibrary();
  }

  change(event: MatSlideToggleChange) {
    this.dssService.setEuclide(event.checked);
  }

  openLibrary() {
    this.dialog.open(LibraryDialog, { disableClose: true, data: {} });
  }
}
