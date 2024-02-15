import { User } from "src/app/models/User";
import { TrackedEvent } from "src/app/models/TrackedEvent";

export interface IUserTrackingProvider {


  /**
   * Initialize the provider
   * 
   * @param isCordovaAvailable 
   */
  initialize(isCordovaAvailable: boolean) : Promise<void>;

  /**
   * Disconnects the tracking of a user in the tracking system. 
   * Usually occurs on logout.
   */
  disconnectUser(): Promise<void>;

  /**
   * Logs a business event in the tracking system.
   * 
   * @param event the event being tracked
   * @param extraInfo any additional information about the event that is useful for reporting
   */
  captureEvent(event: string, extraInfo: any): Promise<void>;

  /**
   * Updates the properties of a user in the tracking system
   * 
   * @param user 
   */
  updateUserInfo(user: User): Promise<void>;

  /**
   * Registers a user in the tracking system
   * 
   * @param userIdForTracking 
   * the identifier in the tracking system.  To avoid overlap in integer identifiers,
   * non production environments have their environment name prepended
   * @param user 
   * The user being registered
   */
  registerUser(userIdForTracking: string, user: User): Promise<void>;

  /**
   * Sets the screen name of the user as they navigate through the app
   * 
   * @param screenName the name of the UI area that the use is in
   */
  setScreenName(screenName: string, eventData?: any): Promise<void>;

}
