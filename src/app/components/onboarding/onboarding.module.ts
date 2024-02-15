import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingRoutingModule as OnboardingRoutingModule } from './onboarding-routing.module';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CreateAccountComponent } from './create-account/create-account.component';
import { TermsOfServiceComponent } from './terms-of-service/terms-of-service.component';
import { ProfileComponent } from './profile/profile.component';
import { WelcomeComponent } from './welcome/welcome.component';



@NgModule({
  declarations: [
    CreateAccountComponent,
    TermsOfServiceComponent,
    ProfileComponent,
    WelcomeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OnboardingRoutingModule
  ],
  exports: [
    CreateAccountComponent,
    TermsOfServiceComponent,
    ProfileComponent
  ]
})
export class OnboardingModule { }
