import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VenueService } from '../app/services/venue.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-venue-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './venue-list.component.html',
  styleUrl: './venue-list.component.css'
})
export class VenueListComponent implements OnInit {
  venues: any[] = [];
  filteredVenues: any[] = [];
  loading = true;
  errorMessage = '';

  searchTerm: string = '';
  selectedCity: string = '';
  selectedSport: string = '';
  cities: string[] = [];
  sports: any[] = [];

  constructor(private venueService: VenueService) {}

  ngOnInit(): void {
    this.loadVenues();
    this.loadSports();
  }

  loadVenues() {
    this.loading = true;
    this.venueService.getAllVenues().subscribe({
      next: (data) => {
        this.venues = data;
        this.filteredVenues = data;
        this.cities = [...new Set(data.map((v: any) => v.city))].sort();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Neuspešno učitavanje terena.';
        this.loading = false;
      }
    });
  }

  loadSports() {
    this.venueService.getSports().subscribe({
      next: (data) => this.sports = data,
      error: () => {}
    });
  }

  applyFilters() {
    this.filteredVenues = this.venues.filter(v => {
      const matchesSearch = v.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                            v.street.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCity = this.selectedCity === '' || v.city === this.selectedCity;
      const matchesSport = this.selectedSport === '' || String(v.sport_id) === String(this.selectedSport);

      return matchesSearch && matchesCity && matchesSport;
    });
  }

  getSportName(sportId: any): string {
    const sport = this.sports.find(s => String(s.id) === String(sportId));
    return sport ? sport.name : 'Sportski Teren';
  }
}

