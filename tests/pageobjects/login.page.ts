import { IonicInput, IonicButton } from '../helpers';
import Page from './page';

/**
 * sub page containing specific selectors and methods for a specific page
 */
class LoginPage extends Page {

  get username() {
    return new IonicInput(`ion-input [type="email"]`)
  }

  get password() {
    return new IonicInput(`ion-input [type="password"]`)
  }

  get loginButton() {
    return new IonicButton(`button.login-button`);
  }

  async login(username: string, password: string) {
    await this.username.setValue(username);
    await this.password.setValue(password);
    return this.loginButton.tap()
  }
  
    
}

export default new LoginPage();
