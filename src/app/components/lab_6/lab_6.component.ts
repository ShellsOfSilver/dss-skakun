import { Component, OnInit } from '@angular/core';

import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { DSSService } from '../../services/dss.service';
import { DSSData, PAGE_NAME } from '../../models/dss';

@Component({
  selector: 'app-lab_6',
  templateUrl: './lab_6.component.html',
  styleUrls: ['./lab_6.component.scss']
})
export class Lab6Component implements OnInit {

  dssData!: Observable<DSSData | null>;

  constructor(
    private dssService: DSSService,
  ) { }

  ngOnInit(): void {
    let isPresent = false;

    this.dssData = combineLatest([
      this.dssService.getDssData$(),
      this.dssService.getCurrentPage$()
    ]).pipe(
      map(([data, page]) => {
        if (page === PAGE_NAME['Part 6'] || isPresent) {
          isPresent = true;
          return data;
        }
        return null;
      })
    );
  }
}
