import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiUrl = 'http://localhost:5000/api/bookings';

  constructor(private http: HttpClient) {}

  getOccupiedSlots(venueId: string, date: string) {
    return this.http.get<any[]>(`${this.apiUrl}/occupied?venueId=${venueId}&date=${date}`);
  }

  createBooking(bookingData: any) {
    return this.http.post(`${this.apiUrl}/create`, bookingData);
  }

  getMyBookings() {
    return this.http.get<any[]>(`${this.apiUrl}/my-reservations`);
  }

  // NOVO: Za vlasnika
  getOwnerReport() {
    return this.http.get<any[]>(`${this.apiUrl}/owner-report`);
  }

  cancelBooking(id: string) {
    return this.http.patch(`${this.apiUrl}/${id}/cancel`, {});
  }

  blockSlot(blockData: any) {
    return this.http.post(`${this.apiUrl}/block`, blockData);
  }

  getBookingById(id: string) {
    return this.http.get<any>(`${this.apiUrl}/${id}/details`);
  }

  cancelByOwner(id: string) {
    return this.http.patch(`${this.apiUrl}/${id}/owner-cancel`, {});
  }

  createRecurringBooking(data: any) {
    return this.http.post(`${this.apiUrl}/create-recurring`, data);
  }

}