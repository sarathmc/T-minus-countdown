import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'account',
    loadComponent: () => import('./features/account/account.component').then((m) => m.AccountComponent),
    title: 'Account · T-Minus Countdown',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Dashboard · T-Minus Countdown',
  },
  {
    path: 'countdowns',
    loadComponent: () =>
      import('./features/countdowns/countdown-list/countdown-list.component').then(
        (m) => m.CountdownListComponent
      ),
    title: 'Countdowns · T-Minus Countdown',
  },
  {
    path: 'countdowns/new',
    loadComponent: () =>
      import('./features/countdowns/countdown-form/countdown-form.component').then(
        (m) => m.CountdownFormComponent
      ),
    title: 'New countdown · T-Minus Countdown',
  },
  {
    path: 'countdowns/:id/edit',
    loadComponent: () =>
      import('./features/countdowns/countdown-form/countdown-form.component').then(
        (m) => m.CountdownFormComponent
      ),
    title: 'Edit countdown · T-Minus Countdown',
  },
  {
    path: 'countdowns/:id',
    loadComponent: () =>
      import('./features/countdowns/countdown-detail/countdown-detail.component').then(
        (m) => m.CountdownDetailComponent
      ),
    title: 'Countdown · T-Minus Countdown',
  },
  {
    path: 'reminders',
    loadComponent: () => import('./features/reminders/reminders.component').then((m) => m.RemindersComponent),
    title: 'Reminders · T-Minus Countdown',
  },
  {
    path: 'settings/backup',
    loadComponent: () => import('./features/settings/data-backup.component').then((m) => m.DataBackupComponent),
    title: 'Backup & restore · T-Minus Countdown',
  },
  {
    path: 'theme-studio',
    loadComponent: () =>
      import('./features/wallpaper-studio/wallpaper-studio.component').then(
        (m) => m.WallpaperStudioComponent
      ),
    title: 'Theme Studio · T-Minus Countdown',
  },
  {
    path: 'theme-studio/:countdownId',
    loadComponent: () =>
      import('./features/wallpaper-studio/wallpaper-studio.component').then(
        (m) => m.WallpaperStudioComponent
      ),
    title: 'Theme Studio · T-Minus Countdown',
  },
  {
    path: 'wallpaper-studio',
    pathMatch: 'full',
    redirectTo: 'theme-studio',
  },
  {
    path: 'wallpaper-studio/:countdownId',
    redirectTo: 'theme-studio/:countdownId',
  },
  { path: '**', redirectTo: 'dashboard' },
];
