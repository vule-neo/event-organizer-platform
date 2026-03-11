import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private apiUrl = 'http://localhost:5000/api/reviews';

  constructor(private http: HttpClient) {}

  submitReview(reviewData: any): Observable<any> {
    return this.http.post(this.apiUrl, reviewData);
  }

  getVenueReviews(venueId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/venue/${venueId}`);
  }
}