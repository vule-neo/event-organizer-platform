import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../services/review.service';

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-modal.component.html',
  styleUrl: './review-modal.component.css'
})
export class ReviewModalComponent {
  @Input() booking: any; // Prima podatke o rezervaciji (id, venue_id, venue_name)
  @Output() close = new EventEmitter<void>();
  @Output() done = new EventEmitter<void>();

  rating = 5;
  comment = '';
  loading = false;
  errorMessage = '';  // <-- DODAJ OVO!

  constructor(private reviewService: ReviewService) { }

  saveReview() {
    if (!this.booking) return;

    this.loading = true;
    this.errorMessage = '';  // Resetuj grešku

    const reviewData = {
      booking_id: this.booking.id,
      venue_id: this.booking.venue_id,
      rating: this.rating,
      comment: this.comment
    };

    console.log('Šaljem review:', reviewData);

    this.reviewService.submitReview(reviewData).subscribe({
      next: () => {
        this.loading = false;
        this.done.emit();
      },
      error: (err) => {
        console.error('Greška pri slanju recenzije:', err);
        this.errorMessage = err.error?.message || 'Došlo je do greške. Pokušajte ponovo.';
        this.loading = false;
      }
    });
  }

  setRating(stars: number) {
    this.rating = stars;
    // Resetuj errorMessage kada korisnik menja ocenu
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }
}