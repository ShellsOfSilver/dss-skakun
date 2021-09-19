import { Component, OnInit } from '@angular/core';

import { Observable } from 'rxjs';

import { DSSData, DSSService } from '../../services/dss.service';

@Component({
  selector: 'app-lab_2',
  templateUrl: './lab_2.component.html',
  styleUrls: ['./lab_2.component.scss']
})
export class Lab2Component implements OnInit {

  dssData!: Observable<DSSData>;

  constructor(
    private dssService: DSSService,
  ) { }

  ngOnInit(): void {
    this.dssData = this.dssService.getDssData$();
  }
}
