import { Routes } from '@angular/router';
import { HomePage } from './shell/home.page';
import { NotFoundPage } from './shell/not-found.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomePage },
  { path: '**', component: NotFoundPage },
];
