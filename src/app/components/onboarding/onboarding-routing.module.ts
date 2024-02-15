import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CreateAccountComponent } from './create-account/create-account.component';
import { ProfileComponent } from './profile/profile.component';
import { TermsOfServiceComponent } from './terms-of-service/terms-of-service.component';
import { WelcomeComponent } from './welcome/welcome.component';


const routes: Routes = [
  {
    path: '',
    component: WelcomeComponent
  },
  {
    path: 'account',
    component: CreateAccountComponent
  },
  {
    path: 'terms',
    component: TermsOfServiceComponent
  },
  {
    path: 'profile',
    component: ProfileComponent
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OnboardingRoutingModule {}
