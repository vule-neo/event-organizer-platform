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
    if (!confirm('Da li ste sigurni da želite da obrišete ovaj teren?')) return;

    this.venueService.deleteVenue(venueId).subscribe({
      next: (result: any) => {
        if (result.softDeleted) {
          // Venue had bookings — deactivated instead of deleted
          alert('Teren ima postojeće rezervacije i ne može biti trajno obrisan. Teren je deaktiviran i neće biti vidljiv korisnicima. Sve buduće rezervacije su otkazane.');
          // Update local list — mark as inactive instead of removing
          const venue = this.venues.find(v => v.id === venueId);
          if (venue) venue.is_active = false;
        } else {
          // Fully deleted
          this.venues = this.venues.filter(v => v.id !== venueId);
        }
      },
      error: (err: any) => {
        console.error(err);
        alert('Greška pri brisanju terena: ' + (err?.error?.message || 'Pokušaj ponovo.'));
      }
    });
  }

  onEdit(venueId: string) {
    // Šaljemo usera na formu za editovanje
    this.router.navigate(['/venues/edit', venueId]);
  }

  onView(venueId: string) {
    // Dodajemo '/details' jer tako piše u tvojim rutama
    this.router.navigate(['/venues/details', venueId]);
  }

  onToggleActive(venue: any) {
    const akcija = venue.is_active ? 'deaktivirate' : 'aktivirate';
    if (confirm(`Da li želite da ${akcija} teren "${venue.name}"?`)) {
      this.venueService.toggleVenueActive(venue.id).subscribe({
        next: (res) => {
          venue.is_active = res.is_active;
        },
        error: () => alert('Greška pri promjeni statusa.')
      });
    }
  }
}