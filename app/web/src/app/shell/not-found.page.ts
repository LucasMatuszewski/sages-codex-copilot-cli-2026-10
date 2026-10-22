import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-not-found-page',
  templateUrl: './not-found.page.html',
  styleUrl: './not-found.page.scss',
  imports: [IonContent, RouterLink],
})
export class NotFoundPage {}
