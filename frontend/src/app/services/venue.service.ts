import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Venue {
  id: string;
  name: string;
  city: string;
  street: string;
  country: string;
  price_per_slot: number;
  slot_duration_mins: number;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class VenueService {
  private apiUrl = 'http://localhost:5000/api/venues';// Bilo je: private sportsUrl = 'http://localhost:5000/api/sports';
// Promeni u:
  private sportsUrl = 'http://localhost:5000/api/venues/sports';
  constructor(private http: HttpClient) {}

  // 1. Kreiranje (POST šalje ceo objekat/FormData)
  createVenue(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/new`, data);
  }

  // 2. Dobavljanje za vlasnika - SADA JE GET
  getVenuesForOwner(ownerId: string): Observable<Venue[]> {
    // Šalje zahtev na: http://localhost:5000/api/venues/owner/UUID
    return this.http.get<Venue[]>(`${this.apiUrl}/owner/${ownerId}`);
  }

  // 3. Početna strana (Ovo bi realno trebalo da bude GET)
  getAllVenues(): Observable<Venue[]> {
    return this.http.get<Venue[]>(`${this.apiUrl}/all`);
  }

  deleteVenue(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getVenueById(id: string) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  updateVenue(id: string, data: FormData) {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  getSports(): Observable<any[]> {
    return this.http.get<any[]>(this.sportsUrl);
  }

  toggleVenueActive(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-active`, {});
  }

  
}


