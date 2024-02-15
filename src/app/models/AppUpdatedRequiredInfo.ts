// When the back-end detects an out-of date app version, this model provides
// additional information to display to the user.
export class AppUpdatedRequiredInfo {
  calling_os: string;
  calling_version: string;
  minimum_version: string;
  store_url: string;
  title: string;
  message: string;
}
