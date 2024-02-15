import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { GigAccountManagementComponent } from './components/gig-account-management/gig-account-management/gig-account-management.component';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: '/splash',
    pathMatch: 'full'
  },
  {
    path: 'help',
    loadChildren: () => import('./pages/help/help.module').then(m => m.HelpPageModule)
  },
  {
    path: 'research',
    loadChildren: () => import('./pages/research/research.module').then(m => m.ResearchPageModule)
  },
  {
    path: 'profile',
    loadChildren: () => import('./pages/profile/profile.module').then(m => m.ProfilePageModule)
  },
  {
    path: 'profile/:pageTo',
    loadChildren: () => import('./pages/profile/profile.module').then(m => m.ProfilePageModule)
  },
  {
    path: 'reset-password',
    loadChildren: () => import('./pages/reset-password/reset-password.module').then(m => m.ResetPasswordPageModule)
  },
  {
    path: 'splash',
    loadChildren: () => import('./pages/splash/splash.module').then(m => m.SplashPageModule)
  },
  {
    path: 'work-settings',
    loadChildren: () => import('./pages/work-settings/work-settings.module').then(m => m.WorkSettingsPageModule)
  },
  {
    path: 'onboarding',
    loadChildren: () => import('./components/onboarding/onboarding.module').then(m => m.OnboardingModule)
  },
  {
    path: 'gig-accounts',
    loadChildren: () => import('./components/gig-account-management/gig-account-management.module').then(m => m.GigAccountManagementModule)
  },
  {
    path: 'marketing',
    loadChildren: () => import('./components/marketing/marketing.module').then(m => m.MarketingModule)
  },
  {
    path: 'expenses',
    loadChildren: () => import('./components/expense/expense.module').then(m => m.ExpenseModule)
  },
  {
    path: 'goals',
    loadChildren: () => import('./components/goals/goals.module').then(m => m.GoalsModule)
  },
  {
    path: 'shifts',
    loadChildren: () => import('./components/shifts/shifts.module').then(m => m.ShiftsModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
