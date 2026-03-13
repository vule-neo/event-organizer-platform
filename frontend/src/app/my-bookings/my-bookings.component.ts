import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingService } from '../services/booking.service';
import { ReviewModalComponent } from '../review-modal/review-modal.component';
import { RouterLink } from '@angular/router';

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

  constructor(private bookingService: BookingService) {}

  ngOnInit(): void {
    this.bookingService.getMyBookings().subscribe({
      next: (data) => {
        this.bookings = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'confirmed': return 'badge bg-success';
      case 'cancelled_by_client': return 'badge bg-danger';
      case 'completed': return 'badge bg-primary';
      default: return 'badge bg-secondary';
    }
  }

  cancelReservation(id: string) {
    if (confirm('Da li ste sigurni da želite da otkažete ovaj termin?')) {
      this.bookingService.cancelBooking(id).subscribe({
        next: (res: any) => {
          alert(res.message);
          // Osveži listu nakon otkazivanja
          this.ngOnInit(); 
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

    // U my-bookings.component.ts
  selectedBooking: any | null = null;

  openReviewModal(booking: any) {
    this.selectedBooking = booking;
  }

  handleReviewDone() {
    this.selectedBooking = null;
    // Ovde pozovi servis da ponovo učitaš listu (refresh) 
    // kako bi status bookinga osvežio ili sklonio dugme za ocenu
  }

  getStatusLabel(status: string): string {
    const map: any = {
      'confirmed': 'Potvrđeno',
      'completed': 'Završeno',
      'cancelled_by_client': 'Otkazano',
      'cancelled_late': 'Kasno otkazano',
      'cancelled_by_owner': 'Otkazao vlasnik'
    };
    return map[status] || status;
  }

}