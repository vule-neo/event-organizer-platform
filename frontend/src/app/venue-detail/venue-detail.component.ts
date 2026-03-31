import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { VenueService } from '../services/venue.service';
import { BookingService } from '../services/booking.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

const namePattern = /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄČĆĘÈÉÊËĖĮÌÍÎÏŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð ,.'-]+$/;

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
  apiBase = environment.apiBase;

  showStickyButton: boolean = false;
  private scrollListener: any;

  today: string = new Date().toISOString().split('T')[0];
  selectedDate: string = this.today;
  availableSlots: any[] = [];
  selectedSlot: any = null;
  occupiedSlots: string[] = [];

  // Custom Calendar State
  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();
  calendarDays: any[] = [];
  monthNames = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
  shortDayNames = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];

  // Reviews
  reviews: any[] = [];
  canReview = false;
  reviewRating = 5;
  reviewComment = '';
  reviewSubmitting = false;
  reviewSuccess = false;
  reviewError = '';
  hoverRating = 0;

  scrollProgress: number = 0;

  // Inline Auth Modal
  showAuthModal = false;
  authModalTab: 'login' | 'register' = 'login';
  authData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: ''
  };
  authLoading = false;
  authError = '';
  showPassword = false;
  stickyDismissed = false;

  dayNames = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];

  constructor(
    private route: ActivatedRoute,
    private venueService: VenueService,
    private bookingService: BookingService,
    public authService: AuthService,
    private router: Router,
    private meta: Meta,
    private title: Title
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadVenue(id);
      // Provjeri da li je korisnik već kliknuo na sticky CTA u ovoj sesiji
      this.stickyDismissed = sessionStorage.getItem(`sticky_dismissed_${id}`) === 'true';
    }

    this.setupScrollListener();

    this.route.queryParams.subscribe(params => {
      if (params['scrollTo'] === 'booking') {
        setTimeout(() => {
          this.scrollToBooking();
        }, 500);
      }
    });
  }

  ngOnDestroy() {
    // Očisti scroll listener kada se komponenta uništi
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  private setupScrollListener() {
    this.scrollListener = () => {
      const bookingSection = document.getElementById('booking-section');
      if (bookingSection) {
        const rect = bookingSection.getBoundingClientRect();
        const isBookingVisible = rect.top <= window.innerHeight && rect.bottom >= 0;
        const scrollY = window.scrollY || window.pageYOffset;
        this.showStickyButton = !isBookingVisible || scrollY > 300;
      } else {
        this.showStickyButton = window.scrollY > 300;
      }

      // DODAJ OVO ZA PROGRESS BAR:
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      this.scrollProgress = (winScroll / height) * 100;
    };

    window.addEventListener('scroll', this.scrollListener);
    setTimeout(() => this.scrollListener(), 100);
  }

  loadVenue(id: string) {
    this.loading = true;
    this.venueService.getVenueById(id).subscribe({
      next: (data) => {
        this.venue = data;
        if (data.images && data.images.length > 0) {
          // CORRECT:
          const firstImg = data.images[0].url;  // url je ispravno polje
          this.activeImageUrl = firstImg.startsWith('http') ? firstImg : this.apiBase + firstImg;
        }
        this.updateSEOTags();
        this.loadOccupiedSlots();
        this.generateCalendar();
        this.loadReviews();
        this.checkCanReview();
        this.loading = false;
      },
      error: () => { this.errorMessage = 'Greška pri učitavanju detalja terena.'; this.loading = false; }
    });
  }

  private updateSEOTags() {
    if (!this.venue) return;
    const venueTitle = `${this.venue.name} - Rezervacija | SportskiTermin`;
    const venueDesc = `Rezerviši termin na ${this.venue.name} u gradu ${this.venue.city}. Najbolji sportski tereni na jednom mestu.`;

    this.title.setTitle(venueTitle);
    this.meta.updateTag({ name: 'description', content: venueDesc });
    this.meta.updateTag({ name: 'keywords', content: `sport, teren, rezervacija, ${this.venue.name}, ${this.venue.city}, ${this.venue.sport_id}` });
  }

  loadReviews() {
    this.venueService.getVenueReviews(this.venue.id).subscribe({
      next: (data) => this.reviews = data,
      error: () => { }
    });
  }

  checkCanReview() {
    const user = this.authService.getUser();
    if (!user || user.id === this.venue.owner_id) return;
    this.bookingService.getMyBookings().subscribe({
      next: (bookings: any[]) => {
        const now = new Date();
        this.canReview = bookings.some(b =>
          b.venue_id === this.venue.id &&
          new Date(b.end_time) < now &&
          b.status !== 'cancelled_by_client' &&
          b.status !== 'cancelled_by_owner' &&
          !b.is_reviewed
        );
      },
      error: () => { }
    });
  }

  getCompletedBookingId(): string | null { return null; }

  submitReview() {
    if (!this.reviewComment.trim()) { this.reviewError = 'Unesite komentar.'; return; }
    this.reviewSubmitting = true;
    this.reviewError = '';
    this.bookingService.getMyBookings().subscribe({
      next: (bookings: any[]) => {
        const booking = bookings.find(b =>
          b.venue_id === this.venue.id && b.status === 'completed' && !b.is_reviewed
        );
        if (!booking) { this.reviewError = 'Nema završenih rezervacija za recenziju.'; this.reviewSubmitting = false; return; }
        this.venueService.submitReview({
          venue_id: this.venue.id,
          booking_id: booking.id,
          rating: this.reviewRating,
          comment: this.reviewComment
        }).subscribe({
          next: () => { this.reviewSuccess = true; this.reviewSubmitting = false; this.canReview = false; this.loadReviews(); this.loadVenue(this.venue.id); },
          error: (err) => { this.reviewError = err.error?.message || 'Greška.'; this.reviewSubmitting = false; }
        });
      }
    });
  }

  setActiveImage(url: string) {
    this.activeImageUrl = url.startsWith('http') ? url : this.apiBase + url;
  }

  // --- CALENDAR ---
  generateCalendar() {
    this.calendarDays = [];
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    let startingDayOfWeek = firstDay.getDay();
    if (startingDayOfWeek === 0) startingDayOfWeek = 7;
    const prevMonthDays = startingDayOfWeek - 1;
    const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const d = new Date(this.currentYear, this.currentMonth - 1, prevMonthLastDay - i);
      this.calendarDays.push(this.createCalendarDayObj(d, false));
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      this.calendarDays.push(this.createCalendarDayObj(new Date(this.currentYear, this.currentMonth, i), true));
    }
    const totalCells = 42;
    for (let i = 1; i <= totalCells - this.calendarDays.length; i++) {
      this.calendarDays.push(this.createCalendarDayObj(new Date(this.currentYear, this.currentMonth + 1, i), false));
    }
    this.loadMonthlyOccupiedSlots();
  }

  private createCalendarDayObj(dateObj: Date, isCurrentMonth: boolean) {
    const zOffset = dateObj.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dateObj.getTime() - zOffset)).toISOString().split('T')[0];
    return {
      date: dateObj,
      dateString: localISOTime,
      dayNumber: dateObj.getDate(),
      isCurrentMonth,
      isPast: localISOTime < this.today,
      isToday: localISOTime === this.today
    };
  }

  prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    this.generateCalendar();
  }

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
    this.generateCalendar();
  }

  selectCalendarDate(day: any) {
    if (day.isPast) return;
    this.selectedDate = day.dateString;
    this.selectedSlot = null;
    this.loadOccupiedSlots();
    if (!day.isCurrentMonth) {
      this.currentMonth = day.date.getMonth();
      this.currentYear = day.date.getFullYear();
      this.generateCalendar();
    }
  }

  onDateChange() { this.selectedSlot = null; this.loadOccupiedSlots(); }

  // --- SLOTS: OVERNIGHT SUPPORT ---
  generateSlots() {
    if (!this.venue || !this.venue.working_hours) return;

    const dateObj = new Date(this.selectedDate + 'T12:00:00');
    const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon...
    const workingDay = this.venue.working_hours.find((h: any) => h.day_of_week === dayOfWeek);

    if (!workingDay || !workingDay.is_open) {
      this.availableSlots = [];
      return;
    }

    const slots = [];
    const openMins = this.parseTime(workingDay.open_time);
    let closeMins = this.parseTime(workingDay.close_time);
    const duration = this.venue.slot_duration_mins;

    // Overnight: ako close <= open, dodaj 24h na close
    // npr. open=08:00 (480), close=02:00 (120) → closeMins = 120 + 1440 = 1560
    const isOvernight = closeMins <= openMins;
    if (isOvernight) closeMins += 24 * 60;

    // Ako je odabrani datum danas, računaj trenutno vreme u Beogradu
    const isToday = this.selectedDate === this.today;
    let nowMins = 0;
    if (isToday) {
      const now = new Date();
      // Beograd = UTC+1 (zimsko) ili UTC+2 (ljetno)
      const belgradeOffset = this.getBelgradeOffsetMins();
      const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes();
      nowMins = (utcMins + belgradeOffset) % (24 * 60);
    }

    let currentTime = openMins;
    while (currentTime + duration <= closeMins) {
      const displayStart = currentTime % (24 * 60);
      const displayEnd = (currentTime + duration) % (24 * 60);
      const startStr = this.formatTime(displayStart);
      const endStr = this.formatTime(displayEnd);

      // Preskoči prošle slotove za danas
      // Za overnight slotove poslije ponoći, displayStart je mali broj (npr. 30 = 00:30)
      // ali currentTime je > 1440, pa ih ne preskačemo zbog nowMins poređenja
      const slotStartForComparison = isOvernight && currentTime >= 24 * 60
        ? displayStart + 24 * 60  // sutrašnji slot, nikad u prošlosti za danas
        : displayStart;

      if (isToday && slotStartForComparison <= nowMins) {
        currentTime += duration;
        continue; // preskači prošle i trenutne slotove
      }

      slots.push({
        start: startStr,
        end: endStr,
        isOvernight: isOvernight && currentTime >= 24 * 60,
        isOccupied: this.occupiedSlots.includes(startStr)
      });
      currentTime += duration;
    }
    this.availableSlots = slots;
  }

  monthlyOccupiedSlots: any[] = [];

  loadMonthlyOccupiedSlots() {
    if (!this.venue) return;
    const monthStr = `${this.currentYear}-${(this.currentMonth + 1).toString().padStart(2, '0')}`;
    this.bookingService.getOccupiedSlots(this.venue.id, monthStr).subscribe({
      next: (occupied: any[]) => {
        this.monthlyOccupiedSlots = occupied;
        this.updateCalendarDaysStatus();
      },
      error: (err) => console.error(err)
    });
  }

  updateCalendarDaysStatus() {
    const occupiedMapped = this.monthlyOccupiedSlots.map(o => {
      const d = new Date(o.start_time);
      const zOffset = d.getTimezoneOffset() * 60000;
      const localDateStr = (new Date(d.getTime() - zOffset)).toISOString().split('T')[0];
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      return { dateString: localDateStr, time: timeStr };
    });

    this.calendarDays.forEach(day => {
      day.isClosed = false;
      day.isFull = false;
      day.isFree = false;

      if (day.isPast || day.isCurrentMonth === false) return;

      const dateObj = new Date(day.dateString + 'T12:00:00');
      const dayOfWeek = dateObj.getDay();
      if (!this.venue.working_hours) return;
      const workingDay = this.venue.working_hours.find((h: any) => h.day_of_week === dayOfWeek);

      if (!workingDay || !workingDay.is_open) {
        day.isClosed = true;
        return;
      }

      const nextDayDate = new Date(dateObj);
      nextDayDate.setDate(nextDayDate.getDate() + 1);
      const nextDayString = nextDayDate.toISOString().split('T')[0];

      const occupiedTimesForThisDay = occupiedMapped
        .filter(o => o.dateString === day.dateString || o.dateString === nextDayString)
        .map(o => o.time);

      const slots = this.getSlotsForDate(day.dateString, occupiedTimesForThisDay);

      if (slots.length === 0) {
        day.isClosed = true;
      } else {
        const hasFree = slots.some(s => !s.isOccupied);
        if (hasFree) {
          day.isFree = true;
        } else {
          day.isFull = true;
        }
      }
    });
  }

  private getSlotsForDate(dateString: string, occupiedTimes: string[]): any[] {
    const dateObj = new Date(dateString + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const workingDay = this.venue.working_hours.find((h: any) => h.day_of_week === dayOfWeek);

    if (!workingDay || !workingDay.is_open) return [];

    const slots = [];
    const openMins = this.parseTime(workingDay.open_time);
    let closeMins = this.parseTime(workingDay.close_time);
    const duration = this.venue.slot_duration_mins;
    const isOvernight = closeMins <= openMins;
    if (isOvernight) closeMins += 24 * 60;

    const isToday = dateString === this.today;
    let nowMins = 0;
    if (isToday) {
      nowMins = (new Date().getUTCHours() * 60 + new Date().getUTCMinutes() + this.getBelgradeOffsetMins()) % (24 * 60);
    }

    let currentTime = openMins;
    while (currentTime + duration <= closeMins) {
      const displayStart = currentTime % (24 * 60);
      const startStr = this.formatTime(displayStart);

      const slotStartForComparison = isOvernight && currentTime >= 24 * 60 ? displayStart + 24 * 60 : displayStart;
      if (isToday && slotStartForComparison <= nowMins) {
        currentTime += duration;
        continue;
      }

      slots.push({
        start: startStr,
        isOccupied: occupiedTimes.includes(startStr)
      });
      currentTime += duration;
    }
    return slots;
  }

  private parseTime(t: string): number {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  private formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  selectSlot(slot: any) { if (!slot.isOccupied) this.selectedSlot = slot; }

  blockSelectedSlot() {
    if (!this.selectedSlot || !this.venue) return;
    const blockData = {
      venue_id: this.venue.id,
      owner_id: this.authService.getUser().id,
      start_time: `${this.selectedDate}T${this.selectedSlot.start}:00Z`,
      end_time: `${this.selectedDate}T${this.selectedSlot.end}:00Z`,
      reason: 'Ručna blokada termina'
    };
    if (confirm(`Blokirati termin ${this.selectedSlot.start}?`)) {
      this.bookingService.blockSlot(blockData).subscribe({
        next: () => { alert('Termin blokiran.'); this.loadOccupiedSlots(); },
        error: (err) => alert(err.error.message)
      });
    }
  }

  loadOccupiedSlots() {
    if (!this.venue || !this.selectedDate) return;
    this.bookingService.getOccupiedSlots(this.venue.id, this.selectedDate).subscribe({
      next: (occupied: any[]) => {
        this.occupiedSlots = occupied.map(o => {
          const date = new Date(o.start_time);
          return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        });
        this.generateSlots();
      },
      error: (err) => console.error(err)
    });
  }

  confirmBooking() {
    if (!this.selectedSlot || !this.venue) return;

    const bookingData = {
      venue_id: this.venue.id,
      start_time: `${this.selectedDate}T${this.selectedSlot.start}:00Z`,
      end_time: `${this.selectedDate}T${this.selectedSlot.end}:00Z`,
      price_paid: this.venue.price_per_slot
    };

    this.bookingService.createBooking(bookingData).subscribe({
      next: (response: any) => {
        // Dohvati ID kreirane rezervacije (zavisi od tvog API response-a)
        const bookingId = response.id || response.booking?.id;

        if (bookingId) {
          // Redirect na detail stranicu sa porukom
          this.router.navigate(['/bookings', bookingId], {
            queryParams: { success: 'true' }
          });
        } else {
          // Fallback ako nema ID-a
          alert('Uspešno rezervisano!');
          this.loadOccupiedSlots();
        }
      },
      error: (err) => alert(err.error.message || 'Greška')
    });
  }

  // Recurring
  recurringWeeks = 4;
  showRecurring = false;
  recurringResult: any = null;
  recurringLoading = false;

  confirmRecurringBooking() {
    if (!this.selectedSlot || !this.venue) return;

    this.recurringLoading = true;
    this.recurringResult = null;

    const data = {
      venue_id: this.venue.id,
      start_time: `${this.selectedDate}T${this.selectedSlot.start}:00Z`,
      end_time: `${this.selectedDate}T${this.selectedSlot.end}:00Z`,
      price_paid: this.venue.price_per_slot,
      weeks: this.recurringWeeks
    };

    this.bookingService.createRecurringBooking(data).subscribe({
      next: (res: any) => {
        this.recurringResult = res;
        this.recurringLoading = false;
        this.loadOccupiedSlots();

        // Ako ima uspešnih rezervacija, pitaj korisnika da li želi da vidi prvu
        if (res.created > 0 && res.bookingIds && res.bookingIds.length > 0) {
          if (confirm(`Rezervisano ${res.created} termina. Želite li da vidite detalje prve rezervacije?`)) {
            this.router.navigate(['/bookings', res.bookingIds[0]]);
          }
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Greška');
        this.recurringLoading = false;
      }
    });
  }

  /** Vraća offset Beograda u minutima (60 zimsko, 120 ljetno) */
  private getBelgradeOffsetMins(): number {
    // Provjeravamo da li je ljetno računanje: CET=UTC+1, CEST=UTC+2
    const jan = new Date(new Date().getFullYear(), 0, 1).getTimezoneOffset();
    const jul = new Date(new Date().getFullYear(), 6, 1).getTimezoneOffset();
    const isDST = new Date().getTimezoneOffset() < Math.max(jan, jul);
    return isDST ? 120 : 60;
  }

  // ---- SHARE ----
  shareMenuOpen = false;
  linkCopied = false;
  private copyTimeout: any;

  toggleShareMenu(e: MouseEvent) {
    e.stopPropagation();
    this.shareMenuOpen = !this.shareMenuOpen;
  }

  @HostListener('document:click')
  closeShareMenu() {
    this.shareMenuOpen = false;
  }

  shareVia(platform: string) {
    const url = window.location.href;
    const text = `Pogledaj ovaj sportski teren: ${this.venue?.name} — `;

    switch (platform) {
      case 'copy':
        navigator.clipboard.writeText(url).then(() => {
          this.linkCopied = true;
          clearTimeout(this.copyTimeout);
          this.copyTimeout = setTimeout(() => {
            this.linkCopied = false;
            this.shareMenuOpen = false;
          }, 2000);
        });
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + url)}`, '_blank');
        this.shareMenuOpen = false;
        break;
      case 'viber':
        window.open(`viber://forward?text=${encodeURIComponent(text + url)}`, '_blank');
        this.shareMenuOpen = false;
        break;
      case 'instagram':
        // Instagram ne podržava direktan URL share — kopiraj link
        navigator.clipboard.writeText(url).then(() => {
          this.linkCopied = true;
          alert('Link kopiran! Otvori Instagram i zalijepi ga u Story.');
          clearTimeout(this.copyTimeout);
          this.copyTimeout = setTimeout(() => { this.linkCopied = false; this.shareMenuOpen = false; }, 3000);
        });
        break;
    }
  }

  scrollToBooking() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Sakrij sticky button i zapamti u sessionStorage
      this.stickyDismissed = true;
      sessionStorage.setItem(`sticky_dismissed_${id}`, 'true');
    }

    const el = document.getElementById('booking-section');
    if (el) {
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 100;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      el.style.transition = 'box-shadow 0.3s ease';
      el.style.boxShadow = '0 0 0 3px var(--gold), 0 0 0 6px rgba(232, 184, 109, 0.3)';
      setTimeout(() => {
        el.style.boxShadow = '';
      }, 1000);

      this.shareMenuOpen = false;
    }
  }

  // ---- INLINE AUTH MODAL ----
  openAuthModal(tab: 'login' | 'register') {
    this.authModalTab = tab;
    this.showAuthModal = true;
    this.authError = '';
    this.showPassword = false;
    this.authData = { firstName: '', lastName: '', email: '', phone: '', password: '' };
  }

  closeAuthModal() {
    this.showAuthModal = false;
  }

  submitInlineLogin() {
    if (!this.authData.email || !this.authData.password) {
      this.authError = 'Sva polja su obavezna'; return;
    }
    this.authLoading = true; this.authError = '';
    this.authService.login(this.authData.email, this.authData.password).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.authLoading = false;
        this.closeAuthModal();
      },
      error: (err) => {
        this.authError = err.error?.message || 'Greška pri prijavi';
        this.authLoading = false;
      }
    });
  }

  submitInlineRegister() {
    if (!this.authData.firstName || !this.authData.lastName || !this.authData.email || !this.authData.password || !this.authData.phone) {
      this.authError = 'Sva polja su obavezna'; return;
    }
    if (!namePattern.test(this.authData.firstName) || !namePattern.test(this.authData.lastName)) {
      this.authError = 'Ime i prezime ne smeju sadržati brojeve ili simbole'; return;
    }
    this.authLoading = true; this.authError = '';
    const payload = {
      first_name: this.authData.firstName,
      last_name: this.authData.lastName,
      email: this.authData.email,
      password: this.authData.password,
      phone: this.authData.phone,
      role: 'customer'
    };
    this.authService.register(payload).subscribe({
      next: () => {
        this.authService.login(this.authData.email, this.authData.password).subscribe({
          next: (res) => {
            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res.user));
            this.authLoading = false;
            this.closeAuthModal();
          },
          error: () => {
            this.authLoading = false;
            this.authModalTab = 'login';
            this.authError = 'Uspešna registracija! Prijavite se.';
          }
        });
      },
      error: (err) => {
        this.authError = err.error?.message || 'Greška pri registraciji';
        this.authLoading = false;
      }
    });
  }
}