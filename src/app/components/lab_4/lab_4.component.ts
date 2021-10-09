import { Component, OnInit } from '@angular/core';

import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { DSSService } from '../../services/dss.service';
import { DSSData, PAGE_NAME } from '../../models/dss';

@Component({
  selector: 'app-lab_4',
  templateUrl: './lab_4.component.html',
  styleUrls: ['./lab_4.component.scss']
})
export class Lab4Component implements OnInit {

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
        if (page === PAGE_NAME['Part 4'] || isPresent) {
          isPresent = true;
          return data;
        }
        return null;
      })
    );
  }
}
