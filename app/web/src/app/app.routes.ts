import { Routes } from '@angular/router';
import { RegisterPage } from './features/register/register-page';
import { NotFoundPage } from './shell/not-found.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'register' },
  { path: 'register', component: RegisterPage },
  { path: '**', component: NotFoundPage },
];
