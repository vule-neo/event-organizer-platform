import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';  // <-- DODAJ OVO

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;  // <-- ISPRAVLJENO

  constructor(private http: HttpClient) { }

  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`);
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }

  toggleUserActive(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${id}/toggle-active`, {});
  }

  getAllVenues(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/venues`);
  }

  toggleVenueActive(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/venues/${id}/toggle-active`, {});
  }

  deleteVenue(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/venues/${id}`);
  }
}