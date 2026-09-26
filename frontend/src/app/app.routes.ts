import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from './core/auth.service';
import { authGuard, roleGuard } from './core/guards';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · Leavewise',
    loadComponent: () => import('./pages/login').then(m => m.LoginPage),
    // Already signed in? Skip the sign-in page.
    canActivate: [() => {
      const auth = inject(AuthService);
      return !auth.signedIn() || inject(Router).parseUrl(auth.homeFor(auth.user()?.role));
    }],
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => {
          const auth = inject(AuthService);
          return auth.homeFor(auth.user()?.role);
        },
      },
      {
        path: 'home',
        title: 'Home · Leavewise',
        canActivate: [roleGuard('EMPLOYEE')],
        loadComponent: () => import('./pages/home').then(m => m.HomePage),
      },
      {
        path: 'apply',
        title: 'Apply for leave · Leavewise',
        canActivate: [roleGuard('EMPLOYEE')],
        loadComponent: () => import('./pages/apply').then(m => m.ApplyPage),
      },
      {
        path: 'calendar',
        title: 'Team calendar · Leavewise',
        loadComponent: () => import('./pages/calendar').then(m => m.CalendarPage),
      },
      {
        path: 'approvals',
        title: 'Approvals · Leavewise',
        canActivate: [roleGuard('MANAGER')],
        loadComponent: () => import('./pages/approvals').then(m => m.ApprovalsPage),
      },
      {
        path: 'settings',
        title: 'Settings · Leavewise',
        canActivate: [roleGuard('HR')],
        loadComponent: () => import('./pages/settings').then(m => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
