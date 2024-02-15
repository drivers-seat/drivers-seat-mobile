import { TestBed } from '@angular/core/testing';

import { StatsService } from './stats.service';

describe('StatsServiceService', () => {
  let service: StatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });


  describe('getStatsWindow',()=>{
    
    describe('SummaryLevel.Week',()=>{
      it('should not have any time',()=>{});
      it('should start on Monday', () => { });
      it('should end on Sunday after', () => { });
      it('should be 7-days', () => { });
      it('should contain the input date', () => { });
    });

    describe('SummaryLevel.Month',()=>{
      it('should not have any time',()=>{});
      it('should start on the first day of month', () => { });
      it('should end on the last day of month', () => { });
      it('should contain the input date', () => { });
    });

    describe('SummaryLevel.Day',()=>{
      it('should not have any time',()=>{});
      it('should have start == end', () => { });
      it('should contain the input date', () => { });
    });
  });

  describe('getStatsWindowNext',()=>{
    
    it('should have the same summary level as input');
    it('should start on the day after the input end');
    
  });

  describe('getStatsWindowPrev',()=>{
    it('should have the same summary level as input');
    it('should end on the day before the input start');
  });

  describe('getComparisonStatistic', () => {

    describe('totalPay', () => {
      it('should be negative when prev week greater than current', () => { });
      it('should be positive when prev week less than current', () => { });
    });


    describe('hourlyPay', () => {
      it('should be negative when prev week greater than current', () => { });
      it('should be positive when prev week less than current', () => { });
    });

    describe('miles', () => {

      it('should be negative when prev week greater than current', () => { });
      it('should be positive when prev week less than current', () => { });

    });

    describe('driving time', () => {

      it('should be negative when prev week greater than current', () => { });
      it('should be positive when prev week less than current', () => { });

      it('should always have positive hours', () => { });
      it('should always have positive minutes', () => { });

      it('should floor to minute', () => { });

    });


    describe('paid time', () => {

      it('should be negative when prev week greater than current', () => { });
      it('should be positive when prev week less than current', () => { });

      it('should always have positive hours', () => { });
      it('should always have positive minutes', () => { });

      it('should floor to minute', () => { });

    });

    describe('paid time percent', () =>{

      it('should be negative when prev week greater than current', () => { });
      it('should be positive when prev week less than current', () => { });
    })
  });
});
