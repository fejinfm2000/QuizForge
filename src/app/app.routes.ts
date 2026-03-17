import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'quiz/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/quiz/quiz.component').then(m => m.QuizComponent)
  },
  {
    path: 'results/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/results/results.component').then(m => m.ResultsComponent)
  },
  { path: '**', redirectTo: 'login' }
];
