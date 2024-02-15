import { TestBed } from '@angular/core/testing';

import { ExternalContentService } from './external-content.service';

describe('ExternalContentService', () => {
  let service: ExternalContentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExternalContentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
