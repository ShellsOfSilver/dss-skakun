import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatNativeDateModule } from '@angular/material/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppMaterialModule } from './material-module';
import { ReactiveFormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';

import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireModule } from '@angular/fire';

import { HeaderComponent } from './components/header/header.component';
import { LibraryDialog } from './dialogs/library/library.component';
import { ManagerDialog } from './dialogs/manager/manager.component';
import { Lab1Component } from './components/lab_1/lab_1.component';
import { Lab2Component } from './components/lab_2/lab_2.component';
import { HomeComponent } from './components/home/home.component';
import { MapComponent } from './components/map/map.component';
import { AppComponent } from './app.component';

const firebaseConfig = {
  apiKey: "AIzaSyBzZvHQfiSebiNx4jsiYO4oX6EF9ecNz4U",
  authDomain: "skakun-dss.firebaseapp.com",
  databaseURL: "https://skakun-dss-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "skakun-dss",
  storageBucket: "skakun-dss.appspot.com",
  messagingSenderId: "625327696644",
  appId: "1:625327696644:web:228ccf5056c4a172a33e51",
  measurementId: "G-1PBX6MH09F"
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    MapComponent,
    Lab1Component,
    Lab2Component,
    LibraryDialog,
    ManagerDialog,
    HeaderComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppMaterialModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    AngularFirestoreModule,
    BrowserAnimationsModule,
    AngularFireModule.initializeApp(firebaseConfig),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
