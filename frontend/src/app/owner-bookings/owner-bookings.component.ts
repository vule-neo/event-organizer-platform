import { Component, OnInit } from '@angular/core';
import { BookingService } from '../services/booking.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-owner-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './owner-bookings.component.html',
  styleUrls: ['./owner-bookings.component.css']
})
export class OwnerBookingsComponent implements OnInit {
  bookings: any[] = [];
  stats = { totalEarnings: 0, confirmedCount: 0 };
  loading = true;

  constructor(private bookingService: BookingService) {}

  ngOnInit(): void {
    this.bookingService.getOwnerReport().subscribe({
      next: (data) => {
        this.bookings = data;
        this.calculateStats();
        this.loading = false;
      },
      error: (err) => console.error(err)
    });
  }

  calculateStats() {
    const confirmed = this.bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
    this.stats.totalEarnings = confirmed.reduce((sum, b) => sum + Number(b.price_paid), 0);
    this.stats.confirmedCount = confirmed.length;
  }

  // Dodaj u klasu metodu:
  cancelBooking(id: string) {
    if (confirm('Da li ste sigurni da želite da otkažete ovaj termin? Novac će biti vraćen klijentu.')) {
      this.bookingService.cancelByOwner(id).subscribe({
        next: (res) => {
          // Osvežavamo status u lokalnom nizu da se UI odmah promeni
          const booking = this.bookings.find(b => b.id === id);
          if (booking) booking.status = 'cancelled_by_owner';
          this.calculateStats(); // Ponovo izračunaj zaradu jer je ovaj termin otpao
          alert('Termin otkazan.');
        },
        error: (err) => alert(err.error.message || 'Greška pri otkazivanju')
      });
    }
  }

}