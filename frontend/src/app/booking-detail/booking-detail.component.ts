import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BookingService } from '../services/booking.service';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './booking-detail.component.html',
  styleUrls: ['./booking-detail.component.css']
})
export class BookingDetailComponent implements OnInit {
  booking: any = null;
  loading = true;
  errorMessage = '';
  showSuccessMessage = false;
  successMessageFading = false;  // <-- Dodaj ovo
  id: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private bookingService: BookingService
  ) {}

  ngOnInit(): void {
    // Prvo dohvati ID iz parametra
    this.id = this.route.snapshot.paramMap.get('id');
    
    // Provjeri query parametre za success poruku
    this.route.queryParams.subscribe(params => {
      if (params['success'] === 'true') {
        this.showSuccessMessage = true;
        this.successMessageFading = false;
        
        // Automatski pokreni fade out nakon 5 sekundi
        setTimeout(() => {
          this.startFadeOut();
        }, 5000);
      }
    });

    // Učitaj podatke o rezervaciji
    if (this.id) {
      this.loadBooking(this.id);
    }
  }

  loadBooking(id: string) {
    this.bookingService.getBookingById(id).subscribe({
      next: (data) => {
        this.booking = data;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Greška pri učitavanju rezervacije.';
        this.loading = false;
      }
    });
  }

  startFadeOut() {
    this.successMessageFading = true;
    
    // Nakon što animacija završi (0.5s), sakrij poruku
    setTimeout(() => {
      this.showSuccessMessage = false;
      this.successMessageFading = false;
    }, 500);
  }

  closeSuccessMessage() {
    this.startFadeOut();  // Koristi istu fade out logiku
  }

  printTicket() {
    window.print();
  }
}