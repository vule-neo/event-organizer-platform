import { Component, OnInit, OnDestroy, HostListener, AfterViewInit, NgZone, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { VenueService } from '../app/services/venue.service';
import { AuthService } from '../app/services/auth.service';
import { FormsModule } from '@angular/forms';
import { environment } from '../environments/environment';

declare var google: any;

@Component({
  selector: 'app-venue-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './venue-list.component.html',
  styleUrl: './venue-list.component.css'
})
export class VenueListComponent implements OnInit, OnDestroy, AfterViewInit {
  venues: any[] = [];
  filteredVenues: any[] = [];
  loading = true;
  errorMessage = '';

  searchTerm = '';
  selectedCity = '';
  selectedSport = '';   // uvijek string, nikad undefined/null
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

  // Map
  private map: any = null;
  private markers: any[] = [];
  private infoWindow: any = null;
  selectedVenue: any = null;
  mapReady = false;
  private mapInitAttempts = 0;

  // Available today carousel
  @ViewChild('carouselTrack') carouselTrackRef!: ElementRef<HTMLElement>;
  availableToday: any[] = [];
  availableTodayLoading = true;
  private isDragging = false;
  private dragStartX = 0;
  private scrollStartX = 0;

  String = String;
  private searchTimeout: any;

  constructor(
    private venueService: VenueService,
    public authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    this.loadVenues();
    this.loadSports();
    this.loadStats();
    this.loadAvailableToday();
    this.startAutoRotate();
    this.loadGoogleMapsScript();
  }

  ngAfterViewInit() {
    this.tryInitMap();
  }

  ngOnDestroy() {
    this.stopAutoRotate();
    this.clearMarkers();
  }

  // ---- AVAILABLE TODAY ----
  loadAvailableToday() {
    this.availableTodayLoading = true;
    this.venueService.getAvailableToday().subscribe({
      next: (data) => { this.availableToday = data; this.availableTodayLoading = false; },
      error: () => { this.availableTodayLoading = false; }
    });
  }

  carouselScroll(dir: 'left' | 'right') {
    const track = this.carouselTrackRef?.nativeElement;
    if (!track) return;
    track.scrollBy({ left: dir === 'right' ? 340 : -340, behavior: 'smooth' });
  }

  onCarouselMouseDown(e: MouseEvent) {
    const track = this.carouselTrackRef?.nativeElement;
    if (!track) return;
    this.isDragging = true;
    this.dragStartX = e.pageX;
    this.scrollStartX = track.scrollLeft;
    track.style.cursor = 'grabbing';
    track.style.userSelect = 'none';
  }

  onCarouselMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;
    const track = this.carouselTrackRef?.nativeElement;
    if (!track) return;
    track.scrollLeft = this.scrollStartX - (e.pageX - this.dragStartX);
  }

  onCarouselMouseUp() {
    const track = this.carouselTrackRef?.nativeElement;
    if (track) { track.style.cursor = 'grab'; track.style.userSelect = ''; }
    this.isDragging = false;
  }

  onCarouselMouseLeave() {
    if (this.isDragging) this.onCarouselMouseUp();
  }

  private dragDistanceMoved = 0;
  onCarouselDragStart(e: MouseEvent) {
    this.dragDistanceMoved = 0;
    this.onCarouselMouseDown(e);
  }

  onCarouselDragMove(e: MouseEvent) {
    if (this.isDragging) {
      this.dragDistanceMoved = Math.abs(e.pageX - this.dragStartX);
      this.onCarouselMouseMove(e);
    }
  }

  navigateToVenue(venueId: string) {
    if (this.dragDistanceMoved < 8) this.router.navigate(['/tereni/detalji', venueId]);
  }

  // ---- GOOGLE MAPS ----
  private loadGoogleMapsScript() {
    if (typeof google !== 'undefined' && google.maps) { this.tryInitMap(); return; }
    if (document.getElementById('google-maps-script')) { this.waitForGoogle(); return; }
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&language=sr`;
    script.async = true;
    script.defer = true;
    script.onload = () => this.ngZone.run(() => this.tryInitMap());
    document.head.appendChild(script);
  }

  private waitForGoogle() {
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google.maps) {
        clearInterval(interval);
        this.ngZone.run(() => this.tryInitMap());
      }
    }, 200);
  }

  private tryInitMap() {
    if (this.map) return;
    if (typeof google === 'undefined' || !google.maps) return;
    const container = document.getElementById('venues-map');
    if (!container) {
      if (this.mapInitAttempts < 20) { this.mapInitAttempts++; setTimeout(() => this.tryInitMap(), 300); }
      return;
    }
    this.initMap(container);
  }

  private initMap(container: HTMLElement) {
    this.map = new google.maps.Map(container, {
      center: { lat: 44.0165, lng: 21.0059 },
      zoom: 7,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d8e8' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f3f0' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0ddd8' }] },
        { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c9c9c9' }] },
      ]
    });
    this.infoWindow = new google.maps.InfoWindow();
    this.mapReady = true;
    if (this.venues.length > 0) this.placeMarkers(this.filteredVenues);
  }

  private clearMarkers() {
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
  }

  private placeMarkers(venues: any[]) {
    if (!this.map || !this.mapReady) return;
    this.clearMarkers();
    const bounds = new google.maps.LatLngBounds();
    let hasValidCoords = false;

    venues.forEach(venue => {
      const lat = parseFloat(venue.lat);
      const lng = parseFloat(venue.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      hasValidCoords = true;
      const position = { lat, lng };
      const svgMarker = {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: '#1e3a5f', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2,
        scale: 1.8, anchor: new google.maps.Point(12, 22),
      };
      const marker = new google.maps.Marker({
        position, map: this.map, title: venue.name, icon: svgMarker,
        animation: google.maps.Animation.DROP
      });
      marker.addListener('click', () => this.ngZone.run(() => {
        this.selectedVenue = venue;
        this.openInfoWindow(marker, venue);
      }));
      this.markers.push(marker);
      bounds.extend(position);
    });

    if (hasValidCoords && venues.length > 1) {
      this.map.fitBounds(bounds);
      google.maps.event.addListenerOnce(this.map, 'idle', () => {
        if (this.map.getZoom() > 13) this.map.setZoom(13);
      });
    } else if (hasValidCoords && venues.length === 1) {
      this.map.setCenter(bounds.getCenter());
      this.map.setZoom(14);
    }
  }

  private openInfoWindow(marker: any, venue: any) {
    const sportName = this.getSportName(venue.sport_id);
    const rating = venue.avg_rating
      ? `<span class="map-popup-rating"><i class="bi bi-star-fill" style="color:#e8b86d;font-size:11px;"></i> ${Number(venue.avg_rating).toFixed(1)}</span>`
      : `<span class="map-popup-new">Novo</span>`;
    const imgSrc = venue.main_image ? `http://localhost:5000${venue.main_image}` : 'assets/no-image.jpg';
    const content = `
      <div class="map-popup">
        <div class="map-popup-img">
          <img src="${imgSrc}" alt="${venue.name}" onerror="this.src='assets/no-image.jpg'" />
          <span class="map-popup-sport">${sportName}</span>
        </div>
        <div class="map-popup-body">
          <h4 class="map-popup-name">${venue.name}</h4>
          <div class="map-popup-meta">${rating}<span class="map-popup-price">${venue.price_per_slot} RSD</span></div>
          <p class="map-popup-loc"><i class="bi bi-geo-alt" style="font-size:11px;margin-right:3px;"></i>${venue.city}</p>
          <a class="map-popup-btn" href="/tereni/detalji/${venue.id}">Pogledaj teren <i class="bi bi-arrow-right" style="font-size:11px;"></i></a>
        </div>
      </div>`;
    this.infoWindow.setContent(content);
    this.infoWindow.open(this.map, marker);
  }

  // ---- VENUES ----
  loadVenues() {
    this.venueService.getAllVenues().subscribe({
      next: (data) => {
        this.venues = data;
        this.filteredVenues = [...data];
        this.cities = [...new Set(data.map((v: any) => v.city).filter(Boolean))].sort() as string[];
        this.loading = false;
        if (this.mapReady) this.placeMarkers(this.filteredVenues);
      },
      error: () => { this.errorMessage = 'Neuspešno učitavanje terena.'; this.loading = false; }
    });
  }

  loadSports() {
    this.venueService.getSports().subscribe({ next: (d) => this.sports = d, error: () => { } });
  }

  loadStats() {
    this.venueService.getPublicStats().subscribe({
      next: (d) => {
        this.statVenues = d.total_venues;
        this.statUsers = d.total_users;
        this.statBookings = d.total_bookings;
      },
      error: () => { }
    });
  }

  // Zatvori dropdownove kada se klikne van (već postoji, ali poboljšaj)
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;

    // Proveri da li je kliknut filter chip ili dugme za reset
    if (target.closest('.filter-chip') || target.closest('.filter-reset-link')) {
      return; // Ne zatvaraj dropdown ako se klikne na filter
    }

    // Zatvori dropdownove ako klik nije unutar search polja
    if (!target.closest('.search-field') && !target.closest('.dropdown-panel')) {
      this.cityOpen = false;
      this.sportOpen = false;
    }
  }

  // Dodaj ove metode za bolje mobile iskustvo

  toggleCityDropdown(e: MouseEvent) {
    e.stopPropagation();

    // Zatvori sport dropdown ako je otvoren
    if (this.sportOpen) {
      this.sportOpen = false;
    }

    // Toggle city dropdown
    this.cityOpen = !this.cityOpen;

    // Na mobile-u, skroluj do dropdowna da bude vidljiv
    if (this.cityOpen && window.innerWidth <= 768) {
      setTimeout(() => {
        const dropdown = document.querySelector('.search-field:has(.dropdown-panel.show)');
        if (dropdown) {
          dropdown.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }
  }

  toggleSportDropdown(e: MouseEvent) {
    e.stopPropagation();

    // Zatvori city dropdown ako je otvoren
    if (this.cityOpen) {
      this.cityOpen = false;
    }

    // Toggle sport dropdown
    this.sportOpen = !this.sportOpen;

    // Na mobile-u, skroluj do dropdowna da bude vidljiv
    if (this.sportOpen && window.innerWidth <= 768) {
      setTimeout(() => {
        const dropdown = document.querySelector('.search-field:has(.dropdown-panel.show)');
        if (dropdown) {
          dropdown.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }
  }



  selectCity(city: string, e?: MouseEvent) {
    e?.stopPropagation();
    this.selectedCity = city;
    this.cityOpen = false;
    this.applyFilters();
  }

  selectSport(sportId: any, e?: MouseEvent) {
    e?.stopPropagation();
    // Uvijek čuvaj kao string
    this.selectedSport = sportId ? String(sportId) : '';
    this.sportOpen = false;
    this.applyFilters();
  }

  onSearchInput() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.applyFilters(), 300);
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilters();
  }

  // Potpuni reset — vraća sve na početak
  resetFilters() {
    this.searchTerm = '';
    this.selectedCity = '';
    this.selectedSport = '';
    this.cityOpen = false;
    this.sportOpen = false;
    this.isFiltering = false;
    this.filteredVenues = [...this.venues];
    if (this.mapReady) this.placeMarkers(this.filteredVenues);
  }

  applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();
    const city = this.selectedCity;
    const sport = this.selectedSport; // uvijek string

    this.isFiltering = !!(term || city || sport);

    if (!this.isFiltering) {
      this.filteredVenues = [...this.venues];
    } else {
      this.filteredVenues = this.venues.filter(v => {
        const matchSearch = !term ||
          v.name?.toLowerCase().includes(term) ||
          v.street?.toLowerCase().includes(term) ||
          v.city?.toLowerCase().includes(term);
        const matchCity = !city || v.city === city;
        const matchSport = !sport || String(v.sport_id) === sport;
        return matchSearch && matchCity && matchSport;
      });
    }

    if (this.mapReady) this.placeMarkers(this.filteredVenues);
  }


  // Metoda za detalje (postojeća, ali ćemo je prilagoditi)
  viewDetails(venueId: string, event: MouseEvent) {
    event.stopPropagation(); // Spreči da se klik propagira na card
    this.router.navigate(['/tereni/detalji', venueId]);
  }

  // Metoda za brzu rezervaciju - vodi na detail i skroluje do booking sekcije
  bookNow(venueId: string, event: MouseEvent) {
    event.stopPropagation();

    // Koristi skipLocationChange da ne triggeruje scroll restoration
    this.router.navigate(['/tereni/detalji', venueId], {
      queryParams: { scrollTo: 'booking' },
      skipLocationChange: false, // Ostavi false, ali dodajemo state
      state: { skipScrollRestoration: true } // Dodajemo custom state
    });
  }

  // Metoda za brzu rezervaciju iz Available Today sekcije
  bookNowFromAvailable(venueId: string, event: MouseEvent) {
    event.stopPropagation(); // Spreči da se klik propagira na card

    // Koristi scroll servis da preskoči automatski scroll na vrh
    // Ako imaš ScrollService, inače samo navigiraj
    this.router.navigate(['/tereni/detalji', venueId], {
      queryParams: { scrollTo: 'booking' },
      state: { skipScroll: true, fromAvailable: true }
    });
  }

  scrollToSearch() {
    const searchCard = document.querySelector('.search-card') as HTMLElement;
    if (searchCard) {
      const yOffset = -100;
      const y = searchCard.getBoundingClientRect().top + window.scrollY + yOffset;
      if (Math.abs(window.scrollY - y) > 50) window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  getSportName(sportId: any): string {
    if (!sportId && sportId !== 0) return '';
    return this.sports.find(x => String(x.id) === String(sportId))?.name ?? '';
  }

  setHowItWorksTab(tab: 'players' | 'owners', userInitiated: boolean = false) {
    this.activeHowItWorksTab = tab;
    if (userInitiated) this.stopAutoRotate();
  }

  private startAutoRotate() {
    this.autoRotateInterval = setInterval(() => {
      this.activeHowItWorksTab = this.activeHowItWorksTab === 'players' ? 'owners' : 'players';
    }, 5000);
  }

  private stopAutoRotate() {
    if (this.autoRotateInterval) { clearInterval(this.autoRotateInterval); this.autoRotateInterval = null; }
  }

  get noVenueCoords(): boolean {
    return this.filteredVenues.length > 0 && this.filteredVenues.every(v => !v.lat || !v.lng);
  }
}