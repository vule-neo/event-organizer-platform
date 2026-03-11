import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VenueService } from '../services/venue.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-owner-venues',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './owner-venues.component.html',
  styleUrl: './owner-venues.component.css'
})
export class OwnerVenuesComponent implements OnInit {
  venues: any[] = [];
  loading: boolean = true;
  errorMessage: string = '';

  constructor(
    private venueService: VenueService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOwnerVenues();
  }

  loadOwnerVenues() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const ownerId = user.id;

    if (!ownerId) {
      this.errorMessage = 'Korisnik nije identifikovan.';
      this.loading = false;
      return;
    }

    this.venueService.getVenuesForOwner(ownerId).subscribe({
      next: (data) => {
        this.venues = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Greška pri učitavanju:', err);
        this.errorMessage = 'Neuspešno učitavanje terena.';
        this.loading = false;
      }
    });
  }

  onDelete(venueId: string) {
    if (confirm('Da li ste sigurni da želite da obrišete ovaj teren i sve njegove slike?')) {
      this.venueService.deleteVenue(venueId).subscribe({
        next: () => {
          // Ukloni obrisani teren iz niza u memoriji da se UI odmah osveži
          this.venues = this.venues.filter(v => v.id !== venueId);
          alert('Teren je uspešno obrisan.');
        },
        error: (err) => {
          console.error(err);
          alert('Greška pri brisanju terena.');
        }
      });
    }
  }

  onEdit(venueId: string) {
    // Šaljemo usera na formu za editovanje
    this.router.navigate(['/venues/edit', venueId]);
  }

  onView(venueId: string) {
    // Dodajemo '/details' jer tako piše u tvojim rutama
    this.router.navigate(['/venues/details', venueId]);
  }
}