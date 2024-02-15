import { TestBed } from '@angular/core/testing';

import { GigPlatformService } from './gig-platform.service';

describe('GigPlatformService', () => {
  let service: GigPlatformService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GigPlatformService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
