import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';  // <-- ISPRAVLJENO

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private apiUrl = `${environment.apiUrl}/reviews`;  // <-- ISPRAVLJENO

  constructor(private http: HttpClient) { }

  submitReview(reviewData: any): Observable<any> {
    return this.http.post(this.apiUrl, reviewData);
  }

  getVenueReviews(venueId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/venue/${venueId}`);
  }
}