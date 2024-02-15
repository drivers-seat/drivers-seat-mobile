import { TestBed } from '@angular/core/testing';

import { GoalTrackingService } from './goal-tracking.service';

describe('GoalTrackingService', () => {
  let service: GoalTrackingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoalTrackingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
