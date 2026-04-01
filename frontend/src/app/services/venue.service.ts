import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';  // <-- DODAJ OVO

export interface Venue {
  id: string;
  name: string;
  city: string;
  street: string;
  country: string;
  price_per_slot: number;
  slot_duration_mins: number;
  description: string;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class VenueService {
  // SVE URL-OVE izvedi iz environment.apiUrl
  private apiUrl = `${environment.apiUrl}/venues`;
  private sportsUrl = `${environment.apiUrl}/venues/sports`;
  private tagsUrl = `${environment.apiUrl}/venues/tags`;
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  createVenue(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/new`, data);
  }

  getVenuesForOwner(ownerId: string): Observable<Venue[]> {
    return this.http.get<Venue[]>(`${this.apiUrl}/owner/${ownerId}`);
  }

  getAllVenues(): Observable<Venue[]> {
    return this.http.get<Venue[]>(`${this.apiUrl}/all`);
  }

  getPublicStats(): Observable<{ total_venues: number; total_users: number; total_bookings: number }> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  getAvailableToday(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/available-today`);
  }

  deleteVenue(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getVenueById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  updateVenue(id: string, data: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  getSports(): Observable<any[]> {
    return this.http.get<any[]>(this.sportsUrl);
  }

  getTags(): Observable<any[]> {
    return this.http.get<any[]>(this.tagsUrl);
  }

  toggleVenueActive(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-active`, {});
  }

  getVenueReviews(venueId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/reviews/venue/${venueId}`);
  }

  submitReview(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/reviews`, data);
  }

  updateReview(id: string, data: { rating: number; comment: string }): Observable<any> {
    return this.http.put(`${this.baseUrl}/reviews/${id}`, data);
  }

  deleteReview(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/reviews/${id}`);
  }
}