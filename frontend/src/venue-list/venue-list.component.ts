import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VenueService } from '../app/services/venue.service';
import { FormsModule } from '@angular/forms'; // Za Search bar

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

  // Filter polja
  searchTerm: string = '';
  selectedCity: string = '';
  cities: string[] = [];

  constructor(private venueService: VenueService) {}

  ngOnInit(): void {
    this.loadVenues();
  }

  loadVenues() {
    this.loading = true;
    this.venueService.getAllVenues().subscribe({
      next: (data) => {
        this.venues = data;
        this.filteredVenues = data;
        
        // Izvlačimo unikatne gradove za filter dropdown
        this.cities = [...new Set(data.map(v => v.city))].sort();
        
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Neuspešno učitavanje terena. Proverite vezu sa serverom.';
        this.loading = false;
      }
    });
  }

  // Funkcija koja filtrira listu u realnom vremenu
  applyFilters() {
    this.filteredVenues = this.venues.filter(v => {
      const matchesSearch = v.name.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
                            v.street.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCity = this.selectedCity === '' || v.city === this.selectedCity;
      
      return matchesSearch && matchesCity;
    });
  }
}