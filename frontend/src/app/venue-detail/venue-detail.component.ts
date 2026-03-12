import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms'; // OBAVEZNO ZA DATUM
import { VenueService } from '../services/venue.service';
import { BookingService } from '../services/booking.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-venue-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './venue-detail.component.html',
  styleUrl: './venue-detail.component.css'
})
export class VenueDetailComponent implements OnInit {
  venue: any = null;
  loading = true;
  errorMessage = '';
  activeImageUrl: string = '';

  // Booking varijable
  today: string = new Date().toISOString().split('T')[0];
  selectedDate: string = this.today;
  availableSlots: any[] = [];
  selectedSlot: any = null;
  occupiedSlots: string[] = []; // Ovde će kasnije dolaziti podaci sa backenda

  dayNames = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];

  constructor(
    private route: ActivatedRoute,
    private venueService: VenueService,
    private bookingService: BookingService,
    public authService : AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadVenue(id);
    }
  }

  loadVenue(id: string) {
    this.loading = true;
    this.venueService.getVenueById(id).subscribe({
      next: (data) => {
        this.venue = data;
        if (data.images && data.images.length > 0) {
          this.activeImageUrl = 'http://localhost:5000' + data.images[0].url;
        }
        console.log(this.venue.images);
        this.loadOccupiedSlots(); // <--- DODAJ OVO OVDE
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Greška pri učitavanju detalja terena.';
        this.loading = false;
      }
    });
  }

  setActiveImage(url: string) {
    this.activeImageUrl = 'http://localhost:5000' + url;
  }

  onDateChange() {
    this.selectedSlot = null; // Resetuj selekciju
    this.loadOccupiedSlots(); // Povuci nove zauzete termine za taj dan
  }

  generateSlots() {
    if (!this.venue || !this.venue.working_hours) return;

    const dateObj = new Date(this.selectedDate);
    const dayOfWeek = dateObj.getDay(); 
    const workingDay = this.venue.working_hours.find((h: any) => h.day_of_week === dayOfWeek);

    if (!workingDay || !workingDay.is_open) {
      this.availableSlots = [];
      return;
    }

    const slots = [];
    let currentTime = this.parseTime(workingDay.open_time);
    const endTime = this.parseTime(workingDay.close_time);
    const duration = this.venue.slot_duration_mins;

    while (currentTime + duration <= endTime) {
      const slotStart = this.formatTime(currentTime);
      const slotEnd = this.formatTime(currentTime + duration);
      
      slots.push({
        start: slotStart,
        end: slotEnd,
        isOccupied: this.occupiedSlots.includes(slotStart)
      });

      currentTime += duration;
    }
    this.availableSlots = slots;
  }

  private parseTime(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  private formatTime(minutes: number) {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  selectSlot(slot: any) {
    if (!slot.isOccupied) {
      this.selectedSlot = slot;
    }
  }

  blockSelectedSlot() {
    if (!this.selectedSlot || !this.venue) return;

    const blockData = {
      venue_id: this.venue.id,
      // Ovde takođe koristimo getUser().id
      owner_id: this.authService.getUser().id, 
      start_time: `${this.selectedDate}T${this.selectedSlot.start}:00Z`,
      end_time: `${this.selectedDate}T${this.selectedSlot.end}:00Z`,
      reason: 'Ručna blokada termina'
    };

    if (confirm(`Da li sigurno želiš da blokiraš termin ${this.selectedSlot.start}?`)) {
      this.bookingService.blockSlot(blockData).subscribe({
        next: () => {
          alert('Termin uspešno blokiran.');
          this.loadOccupiedSlots(); 
        },
        error: (err) => alert(err.error.message)
      });
    }
  }

  

  // Ova funkcija pita backend: "Šta je zauzeto za ovaj teren na ovaj datum?"
  loadOccupiedSlots() {
    if (!this.venue || !this.selectedDate) return;

    const venueId = this.venue.id;
    
    this.bookingService.getOccupiedSlots(venueId, this.selectedDate).subscribe({
      next: (occupied: any[]) => {
        // Izvlačimo samo start_time i formatiramo ga u HH:mm da bi generateSlots() znao da uporedi
        // Pošto tvoj backend vraća "18:00:00+00", substring(11, 16) ili slično zavisi od formata, 
        // ali ako servis vrati čisto vreme, samo ga mapiraj:
        this.occupiedSlots = occupied.map(o => {
          const date = new Date(o.start_time);
          // Koristimo lokalno vreme jer korisnik bira lokalno vreme na frontu
          const h = date.getHours().toString().padStart(2, '0');
          const m = date.getMinutes().toString().padStart(2, '0');
          return `${h}:${m}`;
        });
        
        this.generateSlots(); // Ponovo iscrtaj slotove sa novim podacima o zauzetosti
      },
      error: (err) => console.error('Greška pri učitavanju zauzetih termina', err)
    });
  }

  confirmBooking() {
    if (!this.selectedSlot || !this.venue) return;

    // Pravimo ISO format koji PostgreSQL razume (npr. 2026-03-09T18:00:00Z)
    const startTimeISO = `${this.selectedDate}T${this.selectedSlot.start}:00Z`;
    const endTimeISO = `${this.selectedDate}T${this.selectedSlot.end}:00Z`;

    const bookingData = {
      venue_id: this.venue.id,
      start_time: startTimeISO,
      end_time: endTimeISO,
      price_paid: this.venue.price_per_slot
    };

    this.bookingService.createBooking(bookingData).subscribe({
      next: (res) => {
        alert('Uspešno rezervisano!');
        this.loadOccupiedSlots(); // Osveži listu da se termin zacrveni/onemogući
      },
      error: (err) => alert(err.error.message || 'Greška')
    });
  }
}