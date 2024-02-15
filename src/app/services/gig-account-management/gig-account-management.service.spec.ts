import { TestBed } from '@angular/core/testing';

import { GigAccountManagementService } from './gig-account-management.service';

describe('GigAccountManagementService', () => {
  let service: GigAccountManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GigAccountManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
