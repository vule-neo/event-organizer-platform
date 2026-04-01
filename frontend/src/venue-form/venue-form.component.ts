import { CommonModule } from '@angular/common';
import { Component, ViewChild, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { VenueService } from '../app/services/venue.service';
import { WorkingHoursComponent } from '../app/working-hours/working-hours.component';
import { AddressPickerComponent, AddressResult } from '../app/address-picker/address-picker.component';
import { environment } from '../environments/environment';

interface PricingRule {
  day_of_week: number;
  start_time: string;
  end_time:   string;
  price:      number | null;
  error?:     string;
}

const DAY_NAMES = ['Nedjelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];

@Component({
  selector: 'app-venue-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule, RouterModule, WorkingHoursComponent, AddressPickerComponent],
  templateUrl: './venue-form.component.html',
  styleUrl: './venue-form.component.css'
})
export class VenueFormComponent implements OnInit {
  @ViewChild('workingHoursComp') workingHoursComp!: WorkingHoursComponent;

  venueForm!: FormGroup;
  message = '';
  step: number = 1;
  readonly totalSteps = 5;
  apiBase = environment.apiBase;

  venueId: string | null = null;
  isEditMode: boolean = false;

  existingImages: any[] = [];
  imagesToDelete: number[] = [];
  selectedFiles: File[] = [];
  previewUrls: string[] = [];
  sports: any[] = [];
  isDragging = false;

  allTags: any[] = [];
  selectedTagIds: string[] = [];

  // ===== CENOVNIK =====
  pricingMode: 'fixed' | 'dynamic' = 'fixed';
  pricingRules: PricingRule[] = [];
  pricingError = '';
  readonly dayNames = DAY_NAMES;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private venueService: VenueService
  ) { }

  ngOnInit() {
    this.venueId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.venueId;

    this.venueForm = this.fb.group({
      name:              ['', [Validators.required, Validators.maxLength(200)]],
      sport_id:          ['', [Validators.required]],
      country:           ['Srbija', [Validators.required, Validators.maxLength(100)]],
      city:              ['', [Validators.required, Validators.maxLength(100)]],
      street:            ['', [Validators.required, Validators.maxLength(255)]],
      lat:               [null],
      lng:               [null],
      price_per_slot:    [null, [Validators.min(0.01)]],
      slot_duration_mins:[60, [Validators.required]],
      description:       ['', [Validators.maxLength(1000)]]
    });

    this.loadSports();
    this.loadTags();

    if (this.isEditMode && this.venueId) {
      this.loadVenueData(this.venueId);
    }
  }

  loadSports() {
    this.venueService.getSports().subscribe({
      next: (data) => this.sports = data,
      error: () => this.message = 'Greška pri učitavanju sportova.'
    });
  }

  loadTags() {
    this.venueService.getTags().subscribe({
      next: (data) => this.allTags = data,
      error: () => this.message = 'Greška pri učitavanju tagova.'
    });
  }

  loadVenueData(id: string) {
    this.venueService.getVenueById(id).subscribe({
      next: (data) => {
        this.venueForm.patchValue(data);
        if (data.working_hours) this.savedWorkingHours = data.working_hours;
        if (data.images)        this.existingImages = data.images;
        if (data.tags)          this.selectedTagIds = data.tags.map((t: any) => t.id);

        // Učitaj pricing pravila
        if (data.pricing && data.pricing.length > 0) {
          this.pricingMode = 'dynamic';
          this.pricingRules = data.pricing.map((r: any) => ({
            day_of_week: r.day_of_week,
            start_time:  r.start_time.substring(0, 5),
            end_time:    r.end_time.substring(0, 5),
            price:       parseFloat(r.price)
          }));
        } else {
          this.pricingMode = 'fixed';
          this.pricingRules = [];
        }
      },
      error: () => this.message = 'Greška pri učitavanju podataka.'
    });
  }

  onAddressChange(event: AddressResult) {
    this.venueForm.patchValue({
      city:    event.city,
      street:  event.street,
      country: event.country,
      lat:     event.lat,
      lng:     event.lng
    });
  }

  toggleTag(tagId: string) {
    const index = this.selectedTagIds.indexOf(tagId);
    if (index === -1) this.selectedTagIds.push(tagId);
    else              this.selectedTagIds.splice(index, 1);
  }

  isTagSelected(tagId: string): boolean {
    return this.selectedTagIds.includes(tagId);
  }

  // ===== CENOVNIK HELPERS =====

  addPricingRule() {
    this.pricingRules.push({
      day_of_week: 1,
      start_time:  '08:00',
      end_time:    '22:00',
      price:       null
    });
  }

  removePricingRule(i: number) {
    this.pricingRules.splice(i, 1);
  }

  get fallbackPrice(): number {
    return this.venueForm.get('price_per_slot')?.value || 0;
  }

  validatePricingRules(): boolean {
    this.pricingError = '';
    if (this.pricingMode === 'fixed') return true;

    for (let i = 0; i < this.pricingRules.length; i++) {
      const r = this.pricingRules[i];
      r.error = '';

      if (!r.start_time || !r.end_time) {
        r.error = 'Unesite vremena.';
        this.pricingError = `Pravilo ${i + 1}: unesite početno i krajnje vrijeme.`;
        return false;
      }

      const [sh, sm] = r.start_time.split(':').map(Number);
      const [eh, em] = r.end_time.split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins   = eh * 60 + em;

      if (endMins <= startMins) {
        r.error = 'Kraj mora biti poslije početka.';
        this.pricingError = `Pravilo ${i + 1}: krajnje vrijeme mora biti poslije početnog.`;
        return false;
      }

      if (!r.price || r.price <= 0) {
        r.error = 'Unesite cijenu > 0.';
        this.pricingError = `Pravilo ${i + 1}: cijena mora biti veća od 0.`;
        return false;
      }
    }
    return true;
  }

  // ===== NAVIGATION =====

  savedWorkingHours: any[] = [];
  stepOneError = '';

  nextStep() {
    if (this.step === 1) {
      this.stepOneError = '';
      const f = this.venueForm;
      const hasAddress = f.get('city')?.value && f.get('street')?.value;
      if (!hasAddress) {
        this.stepOneError = 'Pretraži i odaberi adresu iz Google Maps padajuće liste — polja Grad i Ulica moraju biti popunjena.';
        this.venueForm.markAllAsTouched();
        return;
      }
      if (f.valid) {
        this.step = 2;
        setTimeout(() => {
          if (this.workingHoursComp && this.savedWorkingHours.length > 0) {
            this.workingHoursComp.setWorkingHoursData(this.savedWorkingHours);
          }
        }, 100);
      } else {
        this.venueForm.markAllAsTouched();
        this.stepOneError = 'Popuni sva obavezna polja pre nego što nastaviš.';
      }

    } else if (this.step === 2) {
      if (this.workingHoursComp) {
        this.savedWorkingHours = this.workingHoursComp.getWorkingHoursData();
      }
      this.step = 3;

    } else if (this.step === 3) {
      const price = this.venueForm.get('price_per_slot')?.value;
      if (!price || price <= 0) {
        this.pricingError = 'Unesite podrazumijevanu cijenu po terminu (mora biti > 0).';
        this.venueForm.get('price_per_slot')?.markAsTouched();
        return;
      }
      if (!this.validatePricingRules()) return;
      this.step = 4;

    } else if (this.step === 4) {
      this.step = 5;
    }
  }

  prevStep() {
    this.step--;
    this.message = '';
    this.pricingError = '';
  }

  // ===== FILE HANDLING =====

  onFileSelected(event: any) {
    this.handleFiles(event.target.files);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer?.files) this.handleFiles(event.dataTransfer.files);
  }

  private handleFiles(files: FileList) {
    const totalAllowed = 5;
    const currentTotal = this.existingImages.length + this.selectedFiles.length;
    let availableSlots = totalAllowed - currentTotal;

    if (availableSlots <= 0) { this.message = 'Maksimalan broj slika je 5.'; return; }

    Array.from(files).forEach(file => {
      if (availableSlots <= 0) return;
      if (file.type.match(/image\/*/)) {
        this.selectedFiles.push(file);
        const reader = new FileReader();
        reader.onload = (e: any) => this.previewUrls.push(e.target.result);
        reader.readAsDataURL(file);
        availableSlots--;
      }
    });
  }

  removeImage(index: number) {
    this.selectedFiles.splice(index, 1);
    this.previewUrls.splice(index, 1);
  }

  removeExistingImage(imageId: number, index: number) {
    this.imagesToDelete.push(imageId);
    this.existingImages.splice(index, 1);
  }

  // ===== SUBMIT =====

  createVenue() {
    if (this.venueForm.invalid) {
      this.message = 'Podaci o terenu nisu ispravni ili niste odabrali lokaciju.';
      this.step = 1;
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const ownerId = currentUser.id;
    if (!ownerId) { this.message = 'Vlasnik nije identifikovan.'; return; }

    const formData = new FormData();
    const formValues = this.venueForm.value;

    Object.keys(formValues).forEach(key => {
      const val = formValues[key];
      if (val !== null && val !== undefined && val !== '') {
        formData.append(key, val);
      }
    });

    formData.append('working_hours', JSON.stringify(this.savedWorkingHours));
    formData.append('tags', JSON.stringify(this.selectedTagIds));
    this.selectedFiles.forEach(file => formData.append('images', file));
    formData.append('owner_id', ownerId);
    formData.append('currency', 'RSD');

    // Pricing: pošalji pravila ili prazan niz (= briše stara)
    const pricingToSend = this.pricingMode === 'dynamic' ? this.pricingRules : [];
    formData.append('pricing', JSON.stringify(pricingToSend));

    if (this.isEditMode) {
      formData.append('imagesToDelete', JSON.stringify(this.imagesToDelete));
      this.venueService.updateVenue(this.venueId!, formData).subscribe({
        next: () => this.router.navigate(['/tereni/moji']),
        error: (err) => this.message = 'Greška pri ažuriranju: ' + (err?.error?.message || 'Pokušaj ponovo.')
      });
    } else {
      this.venueService.createVenue(formData).subscribe({
        next: () => this.router.navigate(['/tereni/moji']),
        error: (err) => this.message = 'Greška pri kreiranju: ' + (err?.error?.message || 'Pokušaj ponovo.')
      });
    }
  }
}
