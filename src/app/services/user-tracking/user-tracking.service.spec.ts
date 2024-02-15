import { TestBed } from '@angular/core/testing';

import { UserTrackingService } from './user-tracking.service';

describe('UserTrackingService', () => {
  let service: UserTrackingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserTrackingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
