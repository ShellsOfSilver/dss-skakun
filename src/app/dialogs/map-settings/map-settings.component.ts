import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonToggleChange } from '@angular/material/button-toggle';

import { Observable } from 'rxjs';

import { ExtraTextItem } from '../../components/map/map.component';
import { DSSService } from '../../services/dss.service';
import { DSSData } from '../../models/dss';

@Component({
  selector: 'app-map-settings',
  templateUrl: './map-settings.component.html',
  styleUrls: ['./map-settings.component.scss']
})
export class MapSettingsDialog implements OnInit {

  dssData!: Observable<DSSData | null>;
  viewMode: Array<string>;
  programLables: Array<string>;
  extraText: Array<ExtraTextItem>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public documentData: any,
    public dialogRef: MatDialogRef<MapSettingsDialog>,
    private dssService: DSSService,
  ) {
    this.viewMode = documentData.viewMode || [];
    this.programLables = documentData.programLables || [];
    this.extraText = documentData.extraText;
  }

  ngOnInit() {
    this.dssData = this.dssService.getDssData$();
  }

  change(event: MatButtonToggleChange) {
    this.dssService.setMapView(event.value);
    this.dialogRef.close();
  }

  changeProgram(event: MatButtonToggleChange) {
    this.dssService.setProgram(event.value);
    this.dialogRef.close();
  }
}
