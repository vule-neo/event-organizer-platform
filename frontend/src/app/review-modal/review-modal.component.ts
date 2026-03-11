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

  constructor(private reviewService: ReviewService) {}

  saveReview() {
    if (!this.booking) return;

    this.loading = true;
    const reviewData = {
      booking_id: this.booking.id,
      venue_id: this.booking.venue_id, // <--- PROVERI DA LI JE OVO DEFINISANO
      rating: this.rating,
      comment: this.comment
    };

    console.log('Šaljem review:', reviewData); // DODAJ OVO DA VIDIŠ ŠTA IDE NA BACKEND

    this.reviewService.submitReview(reviewData).subscribe({
      next: () => {
        this.loading = false;
        this.done.emit();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  setRating(stars: number) {
    this.rating = stars;
  }
}