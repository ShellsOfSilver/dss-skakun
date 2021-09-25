import { Component, OnInit } from '@angular/core';

import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { DSSService } from '../../services/dss.service';
import { DSSData, PAGE_NAME } from '../../models/dss';

@Component({
  selector: 'app-lab_1',
  templateUrl: './lab_1.component.html',
  styleUrls: ['./lab_1.component.scss']
})
export class Lab1Component implements OnInit {

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
        if (page === PAGE_NAME['Part 1'] || isPresent) {
          isPresent = true;
          return data;
        }
        return null;
      })
    );
  }
}
