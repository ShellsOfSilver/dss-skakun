import { Component, OnInit } from '@angular/core';

import { Observable } from 'rxjs';

import { DSSData, DSSService } from '../../services/dss.service';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.scss']
})
export class ContentComponent implements OnInit {

  dssData!: Observable<DSSData>;

  constructor(
    private dssService: DSSService,
  ) { }

  ngOnInit(): void {
    this.dssService.prepareData();

    this.dssData = this.dssService.getDssData$();
  }
}
