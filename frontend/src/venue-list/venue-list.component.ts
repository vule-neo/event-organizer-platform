import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VenueService } from '../app/services/venue.service';
import { AuthService } from '../app/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-venue-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './venue-list.component.html',
  styleUrl: './venue-list.component.css'
})
export class VenueListComponent implements OnInit, OnDestroy {
  venues: any[] = [];
  filteredVenues: any[] = [];
  loading = true;
  errorMessage = '';

  searchTerm = '';
  selectedCity = '';
  selectedSport: any = '';
  cities: string[] = [];
  sports: any[] = [];

  cityOpen = false;
  sportOpen = false;
  isFiltering = false;
  searchFocused = false;

  statVenues = 0;
  statUsers = 0;
  statBookings = 0;

  activeHowItWorksTab: 'players' | 'owners' = 'players';
  private autoRotateInterval: any;

  String = String;
  private searchTimeout: any;

  constructor(
    private venueService: VenueService,
    public authService: AuthService
  ) { }

  ngOnInit() {
    this.loadVenues();
    this.loadSports();
    this.loadStats();
    this.startAutoRotate();
  }

  ngOnDestroy() {
    this.stopAutoRotate();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.search-dropdown-wrap')) {
      this.cityOpen = false;
      this.sportOpen = false;
    }
  }

  loadVenues() {
    this.venueService.getAllVenues().subscribe({
      next: (data) => {
        this.venues = data;
        this.filteredVenues = data;
        this.cities = [...new Set(data.map((v: any) => v.city).filter(Boolean))].sort() as string[];
        this.loading = false;
      },
      error: () => { this.errorMessage = 'Neuspešno učitavanje terena.'; this.loading = false; }
    });
  }

  loadSports() {
    this.venueService.getSports().subscribe({ next: (d) => this.sports = d, error: () => { } });
  }

  loadStats() {
    this.venueService.getPublicStats().subscribe({
      next: (d) => { this.statVenues = d.total_venues; this.statUsers = d.total_users; this.statBookings = d.total_bookings; },
      error: () => { }
    });
  }

  // Ove metode već postoje u tvom kodu:
  toggleCityDropdown(e: MouseEvent) {
    e.stopPropagation();
    this.cityOpen = !this.cityOpen;
    this.sportOpen = false;
  }

  toggleSportDropdown(e: MouseEvent) {
    e.stopPropagation();
    this.sportOpen = !this.sportOpen;
    this.cityOpen = false;
  }

  selectCity(city: string, e?: MouseEvent) {
    e?.stopPropagation();
    this.selectedCity = city;
    this.cityOpen = false;
    this.applyFilters();
  }

  selectSport(sportId: any, e?: MouseEvent) {
    e?.stopPropagation();
    this.selectedSport = sportId;
    this.sportOpen = false;
    this.applyFilters();
  }

  onSearchInput() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.applyFilters(), 300);
  }

  clearSearch() { this.searchTerm = ''; this.applyFilters(); }

  resetFilters() {
    this.searchTerm = '';
    this.selectedCity = '';
    this.selectedSport = '';
    this.applyFilters();
  }

  applyFilters() {
    this.isFiltering = !!(this.searchTerm || this.selectedCity || this.selectedSport);
    const term = this.searchTerm.toLowerCase();
    this.filteredVenues = this.venues.filter(v => {
      const matchSearch = !term || v.name?.toLowerCase().includes(term) || v.street?.toLowerCase().includes(term) || v.city?.toLowerCase().includes(term);
      const matchCity = !this.selectedCity || v.city === this.selectedCity;
      const matchSport = !this.selectedSport || String(v.sport_id) === String(this.selectedSport);
      return matchSearch && matchCity && matchSport;
    });

    setTimeout(() => {
      this.scrollToSearch();
    }, 50);
  }

  scrollToSearch() {
    const searchCard = document.querySelector('.search-card') as HTMLElement;
    if (searchCard) {
      // Offset -100px kako bi search bar bio malo ispod vrha (i eventualnog navbar-a)
      const yOffset = -100;
      const y = searchCard.getBoundingClientRect().top + window.scrollY + yOffset;

      // Skrolujemo samo ako smo udaljeni više od npr 50px, da ne trza kad je već u fokusu
      if (Math.abs(window.scrollY - y) > 50) {
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  }

  getSportName(sportId: any): string {
    if (!sportId && sportId !== 0) return '';
    return this.sports.find(x => String(x.id) === String(sportId))?.name ?? '';
  }

  // --- HOW IT WORKS TAB LOGIC ---
  setHowItWorksTab(tab: 'players' | 'owners', userInitiated: boolean = false) {
    this.activeHowItWorksTab = tab;
    if (userInitiated) {
      this.stopAutoRotate();
    }
  }

  private startAutoRotate() {
    this.autoRotateInterval = setInterval(() => {
      this.activeHowItWorksTab = this.activeHowItWorksTab === 'players' ? 'owners' : 'players';
    }, 5000); // menjamo svakih 5 sekundi
  }

  private stopAutoRotate() {
    if (this.autoRotateInterval) {
      clearInterval(this.autoRotateInterval);
      this.autoRotateInterval = null;
    }
  }

}