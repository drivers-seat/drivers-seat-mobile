// Respresents a block of time that a user has indicated that they were
// working.  The Location tracking button start/stops shifts, but the
// user can modify their work times also in the activities tab.
export class Shift {
  public user_id: number;
  public start_time: string;
  public end_time: string;
  public id?: number;
  public frontend_mileage?: number;
}
