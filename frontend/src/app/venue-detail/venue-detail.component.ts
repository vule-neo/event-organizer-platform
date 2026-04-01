import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { VenueService } from '../services/venue.service';
import { BookingService } from '../services/booking.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { environment } from '../../environments/environment';

const namePattern = /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄČĆĘÈÉÊËĖĮÌÍÎÏŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð ,.'-]+$/;

@Component({
  selector: 'app-venue-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './venue-detail.component.html',
  styleUrl: './venue-detail.component.css'
})
export class VenueDetailComponent implements OnInit, OnDestroy {
  venue: any = null;
  loading = true;
  errorMessage = '';
  activeImageUrl: string = '';
  apiBase = environment.apiBase;

  stickyDismissed: boolean = false;
  private scrollListener: any;
  private venueId: string = '';
  private pendingScrollToBooking: boolean = false;

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
  myReview: any = null;
  otherReviews: any[] = [];
  displayCount = 5;

  // Review edit/delete state
  showDeleteConfirm = false;
  showEditModal = false;
  editRating = 0;
  editComment = '';
  editError = '';
  reviewActionLoading = false;

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

  dayNames = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];

  constructor(
    private route: ActivatedRoute,
    private venueService: VenueService,
    private bookingService: BookingService,
    public authService: AuthService,
    private router: Router,
    private meta: Meta,
    private title: Title,
    private notif: NotificationService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.venueId = id;
      this.loadVenue(id);
    }

    this.setupScrollListener();

    this.route.queryParams.subscribe(params => {
      if (params['scrollTo'] === 'booking') {
        this.pendingScrollToBooking = true;
      }
    });
  }

  ngOnDestroy() {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  private setupScrollListener() {
    this.scrollListener = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      this.scrollProgress = height > 0 ? (winScroll / height) * 100 : 0;
    };

    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  loadVenue(id: string) {
    this.loading = true;
    this.venueService.getVenueById(id).subscribe({
      next: (data) => {
        this.venue = data;
        if (data.images && data.images.length > 0) {
          const firstImg = data.images[0].url;
          this.activeImageUrl = firstImg.startsWith('http') ? firstImg : this.apiBase + firstImg;
        }
        this.updateSEOTags();
        this.loadOccupiedSlots();
        this.generateCalendar();
        this.loadReviews();
        this.loading = false;
        if (this.pendingScrollToBooking) {
          this.pendingScrollToBooking = false;
          setTimeout(() => this.scrollToBookingOnly(), 300);
        }
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
      next: (data) => {
        this.reviews = data;
        const currentUser = this.authService.getUser();
        if (currentUser) {
          this.myReview = data.find((r: any) => r.client_id === currentUser.id) || null;
          this.otherReviews = data.filter((r: any) => r.client_id !== currentUser.id);
        } else {
          this.myReview = null;
          this.otherReviews = data;
        }
      },
      error: () => { }
    });
  }

  get displayedOtherReviews(): any[] {
    return this.otherReviews.filter(r => r.comment?.trim()).slice(0, this.displayCount);
  }

  get otherReviewsWithCommentCount(): number {
    return this.otherReviews.filter(r => r.comment?.trim()).length;
  }

  get hasMoreReviews(): boolean {
    return this.otherReviewsWithCommentCount > this.displayCount;
  }

  loadMoreReviews() {
    this.displayCount += 5;
  }

  openDeleteConfirm() {
    this.showDeleteConfirm = true;
  }

  confirmDeleteReview() {
    if (!this.myReview) return;
    this.reviewActionLoading = true;
    this.venueService.deleteReview(this.myReview.id).subscribe({
      next: () => {
        this.reviewActionLoading = false;
        this.showDeleteConfirm = false;
        this.loadReviews();
        this.loadVenueRating();
      },
      error: (err) => {
        this.reviewActionLoading = false;
        this.notif.error(err.error?.message || 'Greška pri brisanju recenzije.');
      }
    });
  }

  openEditReview() {
    if (!this.myReview) return;
    this.editRating = this.myReview.rating;
    this.editComment = this.myReview.comment || '';
    this.editError = '';
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  submitEditReview() {
    if (!this.myReview) return;
    if (!this.editRating) { this.editError = 'Odaberite ocjenu.'; return; }
    this.reviewActionLoading = true;
    this.editError = '';
    this.venueService.updateReview(this.myReview.id, { rating: this.editRating, comment: this.editComment }).subscribe({
      next: () => {
        this.reviewActionLoading = false;
        this.showEditModal = false;
        this.loadReviews();
        this.loadVenueRating();
      },
      error: (err) => {
        this.editError = err.error?.message || 'Greška pri izmjeni recenzije.';
        this.reviewActionLoading = false;
      }
    });
  }

  loadVenueRating() {
    this.venueService.getVenueById(this.venueId).subscribe({
      next: (data) => {
        if (this.venue) {
          this.venue.avg_rating = data.avg_rating;
          this.venue.review_count = data.review_count;
        }
      },
      error: () => {}
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

  generateSlots() {
    if (!this.venue || !this.venue.working_hours) return;

    const dateObj = new Date(this.selectedDate + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const workingDay = this.venue.working_hours.find((h: any) => h.day_of_week === dayOfWeek);

    if (!workingDay || !workingDay.is_open) {
      this.availableSlots = [];
      return;
    }

    const slots = [];
    const openMins = this.parseTime(workingDay.open_time);
    let closeMins = this.parseTime(workingDay.close_time);
    const duration = this.venue.slot_duration_mins;

    const isOvernight = closeMins <= openMins;
    if (isOvernight) closeMins += 24 * 60;

    const isToday = this.selectedDate === this.today;
    let nowMins = 0;
    if (isToday) {
      const now = new Date();
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

      const slotStartForComparison = isOvernight && currentTime >= 24 * 60
        ? displayStart + 24 * 60
        : displayStart;

      if (isToday && slotStartForComparison <= nowMins) {
        currentTime += duration;
        continue;
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
      const localDateStr = d.toISOString().split('T')[0];
      const timeStr = `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
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
    this.notif.confirm(`Blokirati termin ${this.selectedSlot.start}?`).then(ok => {
      if (!ok) return;
      this.bookingService.blockSlot(blockData).subscribe({
        next: () => { this.notif.success('Termin je blokiran.'); this.loadOccupiedSlots(); },
        error: (err) => this.notif.error(err.error?.message || 'Greška pri blokiranju.')
      });
    });
  }

  loadOccupiedSlots() {
    if (!this.venue || !this.selectedDate) return;
    this.bookingService.getOccupiedSlots(this.venue.id, this.selectedDate).subscribe({
      next: (occupied: any[]) => {
        this.occupiedSlots = occupied.map(o => {
          const date = new Date(o.start_time);
          return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
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
        const bookingId = response.id || response.booking?.id;
        if (bookingId) {
          this.router.navigate(['/bookings', bookingId], {
            queryParams: { success: 'true' }
          });
        } else {
          this.notif.success('Rezervacija je uspešno kreirana!');
          this.loadOccupiedSlots();
        }
      },
      error: (err) => this.notif.error(err.error?.message || 'Greška pri rezervaciji.')
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
        if (res.created > 0 && res.bookingIds && res.bookingIds.length > 0) {
          this.notif.confirm(`Rezervisano ${res.created} termina. Želite li da vidite detalje prve rezervacije?`).then(ok => {
            if (ok) this.router.navigate(['/bookings', res.bookingIds[0]]);
          });
        }
      },
      error: (err) => {
        this.notif.error(err.error?.message || 'Greška pri kreiranju rezervacija.');
        this.recurringLoading = false;
      }
    });
  }

  private getBelgradeOffsetMins(): number {
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
        navigator.clipboard.writeText(url).then(() => {
          this.linkCopied = true;
          this.notif.info('Link kopiran! Otvori Instagram i zalijepi ga u Story.');
          clearTimeout(this.copyTimeout);
          this.copyTimeout = setTimeout(() => { this.linkCopied = false; this.shareMenuOpen = false; }, 3000);
        });
        break;
    }
  }

  scrollToBooking() {
    this.stickyDismissed = true;
    this.scrollToBookingOnly();
  }

  scrollToBookingOnly() {
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