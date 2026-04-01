import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VenueService } from '../services/venue.service';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../environments/environment';
import { NotificationService } from '../services/notification.service';

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
  apiBase = environment.apiBase;

  constructor(
    private venueService: VenueService,
    private router: Router,
    private notif: NotificationService
  ) { }

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

  async onDelete(venueId: string) {
    const ok = await this.notif.confirm('Da li ste sigurni da želite da obrišete ovaj teren?');
    if (!ok) return;

    this.venueService.deleteVenue(venueId).subscribe({
      next: (result: any) => {
        if (result.softDeleted) {
          this.notif.info('Teren ima rezervacije i ne može biti trajno obrisan — deaktiviran je i neće biti vidljiv korisnicima.');
          const venue = this.venues.find(v => v.id === venueId);
          if (venue) venue.is_active = false;
        } else {
          this.venues = this.venues.filter(v => v.id !== venueId);
          this.notif.success('Teren je uspešno obrisan.');
        }
      },
      error: (err: any) => {
        this.notif.error('Greška pri brisanju terena: ' + (err?.error?.message || 'Pokušaj ponovo.'));
      }
    });
  }

  onEdit(venueId: string) {
    // Šaljemo usera na formu za editovanje
    this.router.navigate(['/tereni/izmena', venueId]);
  }

  onView(venueId: string) {
    // Dodajemo '/details' jer tako piše u tvojim rutama
    this.router.navigate(['/tereni/detalji', venueId]);
  }

  async onToggleActive(venue: any) {
    const akcija = venue.is_active ? 'deaktivirate' : 'aktivirate';
    const ok = await this.notif.confirm(`Da li želite da ${akcija} teren "${venue.name}"?`);
    if (!ok) return;
    this.venueService.toggleVenueActive(venue.id).subscribe({
      next: (res) => {
        venue.is_active = res.is_active;
        this.notif.success(`Teren je ${res.is_active ? 'aktiviran' : 'deaktiviran'}.`);
      },
      error: () => this.notif.error('Greška pri promeni statusa.')
    });
  }
}