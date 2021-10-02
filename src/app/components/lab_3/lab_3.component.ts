import { Component, OnInit } from '@angular/core';

import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { DSSService } from '../../services/dss.service';
import { DSSData, PAGE_NAME } from '../../models/dss';

@Component({
  selector: 'app-lab_3',
  templateUrl: './lab_3.component.html',
  styleUrls: ['./lab_3.component.scss']
})
export class Lab3Component implements OnInit {

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
        if (page === PAGE_NAME['Part 3'] || isPresent) {
          isPresent = true;
          return data;
        }
        return null;
      })
    );
  }
}
