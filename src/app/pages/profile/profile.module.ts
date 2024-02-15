import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SwiperModule } from 'swiper/angular';
import { IonicModule } from '@ionic/angular';
import { ProfilePageRoutingModule } from './profile-routing.module';
import { ProfilePage } from './profile.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule, ReactiveFormsModule,
    ProfilePageRoutingModule,
    SwiperModule
  ],
  declarations: [ProfilePage]
})
export class ProfilePageModule {}
