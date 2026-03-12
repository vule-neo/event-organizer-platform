import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VenueService } from '../services/venue.service';
import { BookingService } from '../services/booking.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-venue-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './venue-detail.component.html',
  styleUrl: './venue-detail.component.css'
})
export class VenueDetailComponent implements OnInit {
  venue: any = null;
  loading = true;
  errorMessage = '';
  activeImageUrl: string = '';

  today: string = new Date().toISOString().split('T')[0];
  selectedDate: string = this.today;
  availableSlots: any[] = [];
  selectedSlot: any = null;
  occupiedSlots: string[] = [];

  // Reviews
  reviews: any[] = [];
  canReview = false;
  reviewRating = 5;
  reviewComment = '';
  reviewSubmitting = false;
  reviewSuccess = false;
  reviewError = '';
  hoverRating = 0;

  dayNames = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];

  constructor(
    private route: ActivatedRoute,
    private venueService: VenueService,
    private bookingService: BookingService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadVenue(id);
    }
  }

  loadVenue(id: string) {
    this.loading = true;
    this.venueService.getVenueById(id).subscribe({
      next: (data) => {
        this.venue = data;
        if (data.images && data.images.length > 0) {
          this.activeImageUrl = 'http://localhost:5000' + data.images[0].url;
        }
        this.loadOccupiedSlots();
        this.loadReviews();
        this.checkCanReview();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Greška pri učitavanju detalja terena.';
        this.loading = false;
      }
    });
  }

  loadReviews() {
    this.venueService.getVenueReviews(this.venue.id).subscribe({
      next: (data) => this.reviews = data,
      error: () => {}
    });
  }

  checkCanReview() {
    const user = this.authService.getUser();
    if (!user || user.id === this.venue.owner_id) return;

    // Provjeri da li ima completed booking za ovaj teren
    this.bookingService.getMyBookings().subscribe({
      next: (bookings: any[]) => {
        this.canReview = bookings.some(b => 
          b.venue_id === this.venue.id && 
          b.status === 'completed' && 
          !b.is_reviewed
        );
      },
      error: () => {}
    });
  }

  getCompletedBookingId(): string | null {
    // Ovo se koristi kad submitujemo review — treba booking_id
    return null; // Handled u submitReview
  }

  submitReview() {
    if (!this.reviewComment.trim()) { this.reviewError = 'Unesite komentar.'; return; }
    this.reviewSubmitting = true;
    this.reviewError = '';

    // Nađi completed booking_id
    this.bookingService.getMyBookings().subscribe({
      next: (bookings: any[]) => {
        const booking = bookings.find(b => 
          b.venue_id === this.venue.id && 
          b.status === 'completed' && 
          !b.is_reviewed
        );

        if (!booking) { this.reviewError = 'Nema završenih rezervacija za recenziju.'; this.reviewSubmitting = false; return; }

        this.venueService.submitReview({
          venue_id: this.venue.id,
          booking_id: booking.id,
          rating: this.reviewRating,
          comment: this.reviewComment
        }).subscribe({
          next: () => {
            this.reviewSuccess = true;
            this.reviewSubmitting = false;
            this.canReview = false;
            this.loadReviews();
            this.loadVenue(this.venue.id); // Osvježi avg_rating
          },
          error: (err) => {
            this.reviewError = err.error?.message || 'Greška.';
            this.reviewSubmitting = false;
          }
        });
      }
    });
  }

  setActiveImage(url: string) {
    this.activeImageUrl = 'http://localhost:5000' + url;
  }

  onDateChange() {
    this.selectedSlot = null;
    this.loadOccupiedSlots();
  }

  generateSlots() {
    if (!this.venue || !this.venue.working_hours) return;
    const dateObj = new Date(this.selectedDate);
    const dayOfWeek = dateObj.getDay();
    const workingDay = this.venue.working_hours.find((h: any) => h.day_of_week === dayOfWeek);
    if (!workingDay || !workingDay.is_open) { this.availableSlots = []; return; }

    const slots = [];
    let currentTime = this.parseTime(workingDay.open_time);
    const endTime = this.parseTime(workingDay.close_time);
    const duration = this.venue.slot_duration_mins;

    while (currentTime + duration <= endTime) {
      slots.push({
        start: this.formatTime(currentTime),
        end: this.formatTime(currentTime + duration),
        isOccupied: this.occupiedSlots.includes(this.formatTime(currentTime))
      });
      currentTime += duration;
    }
    this.availableSlots = slots;
  }

  private parseTime(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  private formatTime(minutes: number) {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  selectSlot(slot: any) {
    if (!slot.isOccupied) this.selectedSlot = slot;
  }

  blockSelectedSlot() {
    if (!this.selectedSlot || !this.venue) return;
    const blockData = {
      venue_id: this.venue.id,
      owner_id: this.authService.getUser().id,
      start_time: `${this.selectedDate}T${this.selectedSlot.start}:00Z`,
      end_time: `${this.selectedDate}T${this.selectedSlot.end}:00Z`,
      reason: 'Ručna blokada termina'
    };
    if (confirm(`Blokirati termin ${this.selectedSlot.start}?`)) {
      this.bookingService.blockSlot(blockData).subscribe({
        next: () => { alert('Termin blokiran.'); this.loadOccupiedSlots(); },
        error: (err) => alert(err.error.message)
      });
    }
  }

  loadOccupiedSlots() {
    if (!this.venue || !this.selectedDate) return;
    this.bookingService.getOccupiedSlots(this.venue.id, this.selectedDate).subscribe({
      next: (occupied: any[]) => {
        this.occupiedSlots = occupied.map(o => {
          const date = new Date(o.start_time);
          return `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
        });
        this.generateSlots();
      },
      error: (err) => console.error(err)
    });
  }

  confirmBooking() {
    if (!this.selectedSlot || !this.venue) return;
    const bookingData = {
      venue_id: this.venue.id,
      start_time: `${this.selectedDate}T${this.selectedSlot.start}:00Z`,
      end_time: `${this.selectedDate}T${this.selectedSlot.end}:00Z`,
      price_paid: this.venue.price_per_slot
    };
    this.bookingService.createBooking(bookingData).subscribe({
      next: () => { alert('Uspešno rezervisano!'); this.loadOccupiedSlots(); },
      error: (err) => alert(err.error.message || 'Greška')
    });
  }

  // Recurring
recurringWeeks = 4;
showRecurring = false;
recurringResult: any = null;
recurringLoading = false;

confirmRecurringBooking() {
  if (!this.selectedSlot || !this.venue) return;
  this.recurringLoading = true;
  this.recurringResult = null;

  const data = {
    venue_id: this.venue.id,
    start_time: `${this.selectedDate}T${this.selectedSlot.start}:00Z`,
    end_time: `${this.selectedDate}T${this.selectedSlot.end}:00Z`,
    price_paid: this.venue.price_per_slot,
    weeks: this.recurringWeeks
  };

  this.bookingService.createRecurringBooking(data).subscribe({
    next: (res: any) => {
      this.recurringResult = res;
      this.recurringLoading = false;
      this.loadOccupiedSlots();
    },
    error: (err) => {
      alert(err.error?.message || 'Greška');
      this.recurringLoading = false;
    }
  });
}

}