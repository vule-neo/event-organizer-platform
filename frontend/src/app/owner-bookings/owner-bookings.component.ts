import { Component, OnInit } from '@angular/core';
import { BookingService } from '../services/booking.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-owner-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './owner-bookings.component.html',
  styleUrls: ['./owner-bookings.component.css']
})
export class OwnerBookingsComponent implements OnInit {
  bookings: any[] = [];
  loading = true;
  dateSortOrder: 'asc' | 'desc' = 'desc';

  get sortedBookings(): any[] {
    return [...this.bookings].sort((a, b) => {
      const diff = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      return this.dateSortOrder === 'asc' ? diff : -diff;
    });
  }

  toggleDateSort() {
    this.dateSortOrder = this.dateSortOrder === 'asc' ? 'desc' : 'asc';
  }

  stats = {
    totalEarnings: 0,
    confirmedCount: 0,
    cancelledCount: 0,
    completedCount: 0
  };

  earningsByVenue: { name: string, earnings: number, count: number }[] = [];
  earningsByMonth: { label: string, earnings: number }[] = [];
  popularHours: { hour: string, count: number }[] = [];

  constructor(private bookingService: BookingService, private notif: NotificationService) { }

  ngOnInit(): void {
    this.bookingService.getOwnerReport().subscribe({
      next: (data) => {
        this.bookings = data;
        this.calculateStats();
        this.calculateEarningsByVenue();
        this.calculateEarningsByMonth();
        this.calculatePopularHours();
        this.loading = false;
      },
      error: (err) => console.error(err)
    });
  }

  calculateStats() {
    const active = this.bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
    this.stats.totalEarnings = active.reduce((sum, b) => sum + Number(b.price_paid), 0);
    this.stats.confirmedCount = this.bookings.filter(b => b.status === 'confirmed').length;
    this.stats.cancelledCount = this.bookings.filter(b =>
      b.status === 'cancelled_by_client' || b.status === 'cancelled_by_owner'
    ).length;
    this.stats.completedCount = this.bookings.filter(b => b.status === 'completed').length;
  }

  calculateEarningsByVenue() {
    const map: { [key: string]: { earnings: number, count: number } } = {};

    this.bookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .forEach(b => {
        if (!map[b.venue_name]) map[b.venue_name] = { earnings: 0, count: 0 };
        map[b.venue_name].earnings += Number(b.price_paid);
        map[b.venue_name].count++;
      });

    this.earningsByVenue = Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.earnings - a.earnings);
  }

  calculateEarningsByMonth() {
    const map: { [key: string]: number } = {};
    const now = new Date();

    // Koristimo UTC metode — Railway server je u UTC
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      map[key] = 0;
    }

    this.bookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .forEach(b => {
        const d = new Date(b.start_time);
        // FIX: getUTCMonth umjesto getMonth — timestamp iz baze je UTC
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        if (map[key] !== undefined) map[key] += Number(b.price_paid);
      });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];
    this.earningsByMonth = Object.entries(map).map(([key, earnings]) => {
      const month = parseInt(key.split('-')[1]) - 1;
      return { label: monthNames[month], earnings };
    });
  }

  calculatePopularHours() {
    const map: { [key: string]: number } = {};

    this.bookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .forEach(b => {
        // FIX: getUTCHours umjesto getHours — timestamp iz baze je UTC
        const hour = new Date(b.start_time).getUTCHours().toString().padStart(2, '0') + ':00';
        map[hour] = (map[hour] || 0) + 1;
      });

    this.popularHours = Object.entries(map)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  getMaxMonthEarnings(): number {
    return Math.max(...this.earningsByMonth.map(m => m.earnings), 1);
  }

  getMaxVenueEarnings(): number {
    return Math.max(...this.earningsByVenue.map(v => v.earnings), 1);
  }

  async cancelBooking(id: string) {
    const ok = await this.notif.confirm('Da li ste sigurni da želite da otkažete ovaj termin?');
    if (!ok) return;
    this.bookingService.cancelByOwner(id).subscribe({
      next: () => {
        const booking = this.bookings.find(b => b.id === id);
        if (booking) booking.status = 'cancelled_by_owner';
        this.calculateStats();
        this.calculateEarningsByVenue();
        this.calculateEarningsByMonth();
        this.notif.success('Termin je otkazan.');
      },
      error: (err) => this.notif.error(err.error?.message || 'Greška pri otkazivanju.')
    });
  }
}