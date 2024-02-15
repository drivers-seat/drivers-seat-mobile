import { clearIndexedDB, pause, restartApp, url, getUrl } from '../helpers';

import LoginPage from  '../pageobjects/login.page';

describe('Login Page', () => {
  beforeEach(async () => {
    await restartApp('/login');
    await clearIndexedDB('_ionicstorage');
    await url('/login');
    await pause(500);
  })

  it('should login with valid credentials', async () => {
    await LoginPage.login("jason@driversseat.co", "W7R9HHv@");
    await pause(10000);
    await expect((await getUrl()).pathname).toBe('/dashboard');
  });
});
