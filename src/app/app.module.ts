import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatNativeDateModule } from '@angular/material/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppMaterialModule } from './material-module';
import { ReactiveFormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';

import { HeaderComponent } from './components/header/header.component';
import { Lab1Component } from './components/lab_1/lab_1.component';
import { Lab2Component } from './components/lab_2/lab_2.component';
import { HomeComponent } from './components/home/home.component';
import { MapComponent } from './components/map/map.component';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    MapComponent,
    Lab1Component,
    Lab2Component,
    HeaderComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppMaterialModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
