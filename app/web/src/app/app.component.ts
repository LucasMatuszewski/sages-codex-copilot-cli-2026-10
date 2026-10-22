import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp, IonContent, IonMenu, IonMenuButton, IonMenuToggle, IonRouterOutlet, IonSplitPane } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  imports: [RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonMenuButton, IonMenuToggle, IonRouterOutlet],
})
export class AppComponent {}
