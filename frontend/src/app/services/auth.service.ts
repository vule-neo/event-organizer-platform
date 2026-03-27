import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';  // <-- DODAJ OVO

// Proširen interfejs da podrži sve podatke o korisniku
interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}/auth`;  // <-- ISPRAVLJENO

  constructor(private http: HttpClient) { }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, {
      email,
      password
    });
  }

  register(data: any) {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken() {
    return localStorage.getItem('token');
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : {};
  }

  isLoggedIn() {
    return !!localStorage.getItem('token');
  }

  // Provera uloge (npr. 'owner' ili 'customer')
  hasRole(role: string): boolean {
    const user = this.getUser();
    return user.role === role;
  }

  // Dobavljanje punog imena korisnika za prikaz u navbaru
  getUserName(): string {
    const user = this.getUser();
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.email || 'Korisnik';
  }

  // Ispravljen URL (uklonjen dupli /auth) i dodat tap za refresh podataka
  updateProfile(userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile-update`, userData).pipe(
      tap((response: any) => {
        if (response && response.user) {
          // Osvežavamo localStorage novim podacima sa servera
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      })
    );
  }

  getProfileFromServer(): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile`).pipe(
      tap((user: any) => {
        // Usput osvežimo localStorage da podaci uvek budu up-to-date
        localStorage.setItem('user', JSON.stringify(user));
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { token, password });
  }
}