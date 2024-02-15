import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { PopupComponent } from './popup/popup.component';
import { ProfileNotificationFooter } from './profile-notification-footer.component';
import { NotificationBanner } from './notification-banner.component';
import { PricingLabelComponent } from './pricing-label.component';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@NgModule({
	declarations: [PopupComponent, PricingLabelComponent, ProfileNotificationFooter, NotificationBanner],
	imports: [],
	exports: [PopupComponent, PricingLabelComponent, ProfileNotificationFooter, NotificationBanner],
	schemas: [ NO_ERRORS_SCHEMA ]
})
export class ComponentsModule {}
