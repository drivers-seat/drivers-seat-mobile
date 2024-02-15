import { TestBed } from '@angular/core/testing';

import { BrowserNavigationService } from './browser-navigation.service';

describe('NavigationService', () => {
  let service: BrowserNavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BrowserNavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
