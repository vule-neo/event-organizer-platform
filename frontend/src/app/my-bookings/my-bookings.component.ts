import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingService } from '../services/booking.service';
import { ReviewModalComponent } from '../review-modal/review-modal.component';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, ReviewModalComponent, RouterLink],
  templateUrl: './my-bookings.component.html',
  styleUrls: ['./my-bookings.component.css']
})
export class MyBookingsComponent implements OnInit {
  bookings: any[] = [];
  loading = true;
  selectedBooking: any | null = null;
  apiBase = environment.apiBase;

  constructor(private bookingService: BookingService) { }

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings() {
    this.loading = true;
    this.bookingService.getMyBookings().subscribe({
      next: (data) => {
        // NE SORTIRAJ OVDE! Backend već vraća ispravan redosled
        this.bookings = data; // Samo dodeli podatke
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'confirmed': 'status-confirmed',
      'completed': 'status-completed',
      'cancelled_by_client': 'status-cancelled',
      'cancelled_late': 'status-cancelled-late',
      'cancelled_by_owner': 'status-cancelled'
    };
    return map[status] || 'status-default';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      'confirmed': 'Potvrđeno',
      'completed': 'Završeno',
      'cancelled_by_client': 'Otkazano',
      'cancelled_late': 'Kasno otkazano',
      'cancelled_by_owner': 'Otkazao vlasnik'
    };
    return map[status] || status;
  }

  cancelReservation(id: string) {
    if (confirm('Da li ste sigurni da želite da otkažete ovaj termin?')) {
      this.bookingService.cancelBooking(id).subscribe({
        next: (res: any) => {
          alert(res.message);
          this.loadBookings(); // Osveži listu nakon otkazivanja
        },
        error: (err) => {
          alert(err.error.message || 'Greška pri otkazivanju');
        }
      });
    }
  }

  canCancel(startTime: string): boolean {
    const start = new Date(startTime).getTime();
    const now = new Date().getTime();
    const diffInHours = (start - now) / (1000 * 60 * 60);
    return diffInHours > 24;
  }

  openReviewModal(booking: any) {
    this.selectedBooking = booking;
  }

  handleReviewDone() {
    this.selectedBooking = null;
    // OSNOVNO: osveži listu rezervacija
    this.loadBookings();
  }
}