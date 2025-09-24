
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'login',    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) },
  { path: 'lobbies',  loadComponent: () => import('./pages/lobbies/lobbies.component').then(m => m.LobbiesComponent) },
  { path: 'game/:id', loadComponent: () => import('./pages/game/game.component').then(m => m.GameComponent) },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
