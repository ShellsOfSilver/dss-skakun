import { Component, OnInit } from '@angular/core';

import { Observable } from 'rxjs';

import { DSSData, DSSService } from '../../services/dss.service';

@Component({
  selector: 'app-lab_1',
  templateUrl: './lab_1.component.html',
  styleUrls: ['./lab_1.component.scss']
})
export class Lab1Component implements OnInit {

  dssData!: Observable<DSSData>;

  constructor(
    private dssService: DSSService,
  ) { }

  ngOnInit(): void {
    this.dssData = this.dssService.getDssData$();
  }
}
