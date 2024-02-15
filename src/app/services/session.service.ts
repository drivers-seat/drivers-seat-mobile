import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { User } from "../models/User";
import { ApiService } from './api.service';
import { UserService } from './user.service';
import { Events } from './events.service';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  public authToken: string;

  constructor(
    public http: HttpClient, 
    public apiService: ApiService, 
    public userService: UserService, 
    public events: Events
  ) {
  }

  getSession() {
    return this.http.get(`${this.apiService.url()}/sessions`)
    .toPromise().then(data => {
      // Returns an Auth token
      this.userService.setUser(User.parseUser(data["data"]));
      return this.userService.currentUser;
    });
  }

  createSession(email, password) {
    return this.http.post(`${this.apiService.url()}/sessions`,
      JSON.stringify({
        "session": {
          "email": email,
          "password": password
        }
      }),
      { headers: {'Content-Type': 'application/json; charset=utf-8'} })
    .toPromise().then(data => {
      let user = User.parseUser(data["data"]);
      this.userService.setUser(user);
      this.events.publish('successfulLogin');
      return this.userService.currentUser;
    });
  }

  forgotPassword(email) {
    return this.http.post(`${this.apiService.url()}/reset_password`,
      JSON.stringify({
        "reset_password": {
          "email": email
        }
      }),
      { headers: {'Content-Type': 'application/json; charset=utf-8'} })
    .toPromise().then(data => {
      return data;
    });
  }

  getAuthToken() {
    return this.authToken;
  }

  clearSession() {
    this.userService.unGhost();
    return this.apiService.removeAuthToken()
    .then(() => {
      this.userService.setUser(null);
    })
  }
}
