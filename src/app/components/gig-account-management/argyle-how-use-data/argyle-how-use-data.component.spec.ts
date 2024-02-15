import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ArgyleHowUseDataComponent } from './argyle-how-use-data.component';

describe('ArgyleHowUseDataComponent', () => {
  let component: ArgyleHowUseDataComponent;
  let fixture: ComponentFixture<ArgyleHowUseDataComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ArgyleHowUseDataComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ArgyleHowUseDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
