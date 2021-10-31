import { Component } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';

import { DSSService } from '../../services/dss.service';
import { PAGE_NAME } from '../../models/dss';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {

  pages = [
    PAGE_NAME[PAGE_NAME.Map],
    PAGE_NAME[PAGE_NAME['Part 1']],
    PAGE_NAME[PAGE_NAME['Part 2']],
    PAGE_NAME[PAGE_NAME['Part 3']],
    PAGE_NAME[PAGE_NAME['Part 4']],
    PAGE_NAME[PAGE_NAME['Part 5']],
    PAGE_NAME[PAGE_NAME['Part 6']],
    PAGE_NAME[PAGE_NAME['Part 7']]
  ];

  constructor(
    private dssService: DSSService,
  ) { }

  selectedTabChange(event: MatTabChangeEvent) {
    this.dssService.currentPage.next(event.index);
  }
}
